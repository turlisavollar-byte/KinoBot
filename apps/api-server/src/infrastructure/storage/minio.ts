/**
 * Object storage client using S3-compatible storage (MinIO, AWS S3, etc.)
 *
 * Videos and generated assets are stored in configured S3-compatible storage.
 * Telegram file IDs are retained as source metadata for ingestion and recovery.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListBucketsCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("Storage");

export interface StorageClient {
  upload(
    bucket: string,
    key: string,
    data: Buffer,
    contentType: string,
  ): Promise<string>;
  uploadStream(
    bucket: string,
    key: string,
    data: Readable,
    contentType: string,
    contentLength: number,
    timeoutMs?: number,
  ): Promise<string>;
  getUrl(bucket: string, key: string): Promise<string>;
  getObjectStream(
    bucket: string,
    key: string,
    timeoutMs?: number,
  ): Promise<Readable>;
  delete(bucket: string, key: string): Promise<void>;
  exists(bucket: string, key: string): Promise<boolean>;
  checkBucket(bucket: string): Promise<void>;
  getPresignedUrl(
    bucket: string,
    key: string,
    expiresIn?: number,
  ): Promise<string>;
}

export const Buckets = {
  THUMBNAILS: "thumbnails",
  SUBTITLES: "subtitles",
  IMAGES: "images",
  TEMP: "temp",
} as const;

export class S3Storage implements StorageClient {
  private client: S3Client;
  private presignClient: S3Client;
  private endpoint?: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT;
    const accessKeyId =
      process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY;
    const secretAccessKey =
      process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY;
    const region =
      process.env.S3_REGION || process.env.MINIO_REGION || "us-east-1";
    const forcePathStyle =
      process.env.S3_FORCE_PATH_STYLE === "true" || endpoint?.includes("minio");

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "S3 credentials not configured. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY",
      );
    }

    this.endpoint = endpoint;

    this.client = new S3Client({
      endpoint: endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region,
      forcePathStyle,
      requestStreamBufferSize: 64 * 1024,
    });

    this.presignClient = new S3Client({
      endpoint: process.env.S3_PRESIGN_ENDPOINT || endpoint,
      credentials: { accessKeyId, secretAccessKey },
      region,
      forcePathStyle,
    });

    this.checkConnection();
  }

  private async checkConnection(): Promise<void> {
    try {
      // Try to list buckets to verify connection
      const command = new ListBucketsCommand({});
      await this.client.send(command);
      logger.info("S3 storage connected successfully");
    } catch (error) {
      logger.error("S3 storage connection failed:", undefined, error);
    }
  }

  async upload(
    bucket: string,
    key: string,
    data: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      });

      await this.client.send(command);
      logger.debug(`File uploaded to ${bucket}/${key}`);
      return `${bucket}/${key}`;
    } catch (error) {
      logger.error(
        `Failed to upload file to ${bucket}/${key}:`,
        undefined,
        error,
      );
      throw error;
    }
  }

  async uploadStream(
    bucket: string,
    key: string,
    data: Readable,
    contentType: string,
    contentLength: number,
    timeoutMs: number = 120_000,
  ): Promise<string> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);
    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: data,
          ContentType: contentType,
          ContentLength: contentLength,
        },
        queueSize: 2,
        partSize: 8 * 1024 * 1024,
        leavePartsOnError: false,
        abortController,
      });
      await upload.done();
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new Error(`S3 upload exceeded timeout of ${timeoutMs} ms`, {
          cause: error,
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    logger.info("Streamed media uploaded to S3", {
      bucket,
      key,
      contentLength,
    });
    return `${bucket}/${key}`;
  }

  async getObjectStream(
    bucket: string,
    key: string,
    timeoutMs: number = 120_000,
  ): Promise<Readable> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { abortSignal: AbortSignal.timeout(timeoutMs) },
    );
    if (!response.Body) {
      throw new Error("S3 returned no object body");
    }
    return Readable.fromWeb(
      response.Body.transformToWebStream() as import("node:stream/web").ReadableStream,
    );
  }

  async getUrl(bucket: string, key: string): Promise<string> {
    if (this.endpoint) {
      // For MinIO/S3-compatible storage
      return `${this.endpoint}/${bucket}/${key}`;
    }
    // For AWS S3
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }

  async getPresignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.presignClient, command, {
        expiresIn,
      });
      return url;
    } catch (error) {
      logger.error(
        `Failed to generate presigned URL for ${bucket}/${key}:`,
        undefined,
        error,
      );
      throw error;
    }
  }

  async checkBucket(bucket: string): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: bucket }), {
      abortSignal: AbortSignal.timeout(5_000),
    });
  }

  async delete(bucket: string, key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.client.send(command);
      logger.debug(`File deleted from ${bucket}/${key}`);
    } catch (error) {
      logger.error(
        `Failed to delete file from ${bucket}/${key}:`,
        undefined,
        error,
      );
      throw error;
    }
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      logger.error(
        `Failed to check existence of ${bucket}/${key}:`,
        undefined,
        error,
      );
      return false;
    }
  }
}

class StubStorage implements StorageClient {
  async upload(
    _bucket: string,
    key: string,
    _data: Buffer,
    _contentType: string,
  ): Promise<string> {
    logger.warn("Storage: S3 not configured, upload skipped (stub)", { key });
    return `stub://${key}`;
  }
  async uploadStream(
    _bucket: string,
    _key: string,
    _data: Readable,
    _contentType: string,
    _contentLength: number,
    _timeoutMs?: number,
  ): Promise<string> {
    throw new Error(
      "S3 storage is not configured; media upload is unavailable",
    );
  }
  async getObjectStream(_bucket: string, _key: string): Promise<Readable> {
    throw new Error(
      "S3 storage is not configured; media download is unavailable",
    );
  }
  async getUrl(_bucket: string, key: string): Promise<string> {
    return `stub://${key}`;
  }
  async delete(_bucket: string, _key: string): Promise<void> {}
  async exists(_bucket: string, _key: string): Promise<boolean> {
    return false;
  }
  async checkBucket(_bucket: string): Promise<void> {
    throw new Error("S3 storage is not configured");
  }
  async getPresignedUrl(
    _bucket: string,
    key: string,
    _expiresIn?: number,
  ): Promise<string> {
    return `stub://${key}`;
  }
}

export const storage: StorageClient =
  process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY
    ? new S3Storage()
    : new StubStorage();

if (process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY) {
  logger.info("Storage: using S3-compatible storage");
} else {
  logger.info("Storage: using stub (no S3 credentials configured)");
}
