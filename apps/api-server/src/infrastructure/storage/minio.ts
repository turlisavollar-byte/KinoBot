/**
 * Object storage client using S3-compatible storage (MinIO, AWS S3, etc.)
 *
 * Current strategy: Videos are stored as Telegram file_ids.
 * MinIO will be used for: thumbnails, subtitles, actor/genre images.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListBucketsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("Storage");

export interface StorageClient {
  upload(bucket: string, key: string, data: Buffer, contentType: string): Promise<string>;
  getUrl(bucket: string, key: string): Promise<string>;
  delete(bucket: string, key: string): Promise<void>;
  exists(bucket: string, key: string): Promise<boolean>;
  getPresignedUrl(bucket: string, key: string, expiresIn?: number): Promise<string>;
}

export const Buckets = {
  THUMBNAILS: "thumbnails",
  SUBTITLES: "subtitles",
  IMAGES: "images",
  TEMP: "temp",
} as const;

class S3Storage implements StorageClient {
  private client: S3Client;
  private endpoint?: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY;
    const region = process.env.S3_REGION || process.env.MINIO_REGION || "us-east-1";
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true" || endpoint?.includes("minio");

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("S3 credentials not configured. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY");
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

  async upload(bucket: string, key: string, data: Buffer, contentType: string): Promise<string> {
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
      logger.error(`Failed to upload file to ${bucket}/${key}:`, undefined, error);
      throw error;
    }
  }

  async getUrl(bucket: string, key: string): Promise<string> {
    if (this.endpoint) {
      // For MinIO/S3-compatible storage
      return `${this.endpoint}/${bucket}/${key}`;
    }
    // For AWS S3
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }

  async getPresignedUrl(bucket: string, key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      return url;
    } catch (error) {
      logger.error(`Failed to generate presigned URL for ${bucket}/${key}:`, undefined, error);
      throw error;
    }
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
      logger.error(`Failed to delete file from ${bucket}/${key}:`, undefined, error);
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
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error(`Failed to check existence of ${bucket}/${key}:`, undefined, error);
      return false;
    }
  }
}

class StubStorage implements StorageClient {
  async upload(_bucket: string, key: string, _data: Buffer, _contentType: string): Promise<string> {
    logger.warn("Storage: S3 not configured, upload skipped (stub)", { key });
    return `stub://${key}`;
  }
  async getUrl(_bucket: string, key: string): Promise<string> {
    return `stub://${key}`;
  }
  async delete(_bucket: string, _key: string): Promise<void> {}
  async exists(_bucket: string, _key: string): Promise<boolean> { return false; }
  async getPresignedUrl(_bucket: string, key: string, _expiresIn?: number): Promise<string> {
    return `stub://${key}`;
  }
}

export const storage: StorageClient = (process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY)
  ? new S3Storage()
  : new StubStorage();

if (process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY) {
  logger.info("Storage: using S3-compatible storage");
} else {
  logger.info("Storage: using stub (no S3 credentials configured)");
}
