/**
 * Object storage client — STUB
 *
 * TODO: Install minio and configure MinIO / S3-compatible storage.
 *   pnpm --filter @workspace/api-server add minio
 *   Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY env vars.
 *
 * Current strategy: Videos are stored as Telegram file_ids.
 * MinIO will be used for: thumbnails, subtitles, actor/genre images.
 */

import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("MinIO");

export interface StorageClient {
  upload(bucket: string, key: string, data: Buffer, contentType: string): Promise<string>;
  getUrl(bucket: string, key: string): Promise<string>;
  delete(bucket: string, key: string): Promise<void>;
  exists(bucket: string, key: string): Promise<boolean>;
}

export const Buckets = {
  THUMBNAILS: "thumbnails",
  SUBTITLES: "subtitles",
  IMAGES: "images",
  TEMP: "temp",
} as const;

class StubStorage implements StorageClient {
  async upload(_bucket: string, key: string, _data: Buffer, _contentType: string): Promise<string> {
    logger.warn("Storage: MinIO not configured, upload skipped (stub)", { key });
    return `stub://${key}`;
  }
  async getUrl(_bucket: string, key: string): Promise<string> {
    return `stub://${key}`;
  }
  async delete(_bucket: string, _key: string): Promise<void> {}
  async exists(_bucket: string, _key: string): Promise<boolean> { return false; }
}

export const storage: StorageClient = new StubStorage();
