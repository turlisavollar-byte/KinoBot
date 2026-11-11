import cron, { type ScheduledTask } from "node-cron";
import { and, asc, eq, gt, isNotNull, lt, or } from "drizzle-orm";
import { db, telegramMediaTable } from "@workspace/db";
import { storage } from "@/infrastructure/storage/minio";
import { Logger } from "@/shared/utils/logger";
import { TELEGRAM_MEDIA_RETENTION_MS } from "./telegram-media.retention-policy";

const logger = Logger.getInstance("TelegramMediaRetention");
const BATCH_SIZE = 100;
let retentionTask: ScheduledTask | undefined;

export async function cleanupExpiredTelegramMedia(): Promise<void> {
  const cutoff = new Date(Date.now() - TELEGRAM_MEDIA_RETENTION_MS);
  let cursor: { uploadedAt: Date; id: string } | undefined;
  let deletedCount = 0;
  let failureCount = 0;

  while (true) {
    const expired = await db
      .select({
        id: telegramMediaTable.id,
        storageBucket: telegramMediaTable.storageBucket,
        storageKey: telegramMediaTable.storageKey,
        thumbnailKey: telegramMediaTable.thumbnailKey,
        uploadedAt: telegramMediaTable.uploadedAt,
      })
      .from(telegramMediaTable)
      .where(
        cursor
          ? and(
              eq(telegramMediaTable.status, "uploaded"),
              lt(telegramMediaTable.uploadedAt, cutoff),
              isNotNull(telegramMediaTable.storageBucket),
              isNotNull(telegramMediaTable.storageKey),
              or(
                gt(telegramMediaTable.uploadedAt, cursor.uploadedAt),
                and(
                  eq(telegramMediaTable.uploadedAt, cursor.uploadedAt),
                  gt(telegramMediaTable.id, cursor.id),
                ),
              ),
            )
          : and(
              eq(telegramMediaTable.status, "uploaded"),
              lt(telegramMediaTable.uploadedAt, cutoff),
              isNotNull(telegramMediaTable.storageBucket),
              isNotNull(telegramMediaTable.storageKey),
            ),
      )
      .orderBy(asc(telegramMediaTable.uploadedAt), asc(telegramMediaTable.id))
      .limit(BATCH_SIZE);

    if (expired.length === 0) break;

    for (const media of expired) {
      if (media.uploadedAt) cursor = { uploadedAt: media.uploadedAt, id: media.id };
      if (!media.storageBucket || !media.storageKey) continue;

      try {
        if (media.thumbnailKey) {
          await storage.delete(media.storageBucket, media.thumbnailKey);
        }
        await storage.delete(media.storageBucket, media.storageKey);
        await db
          .update(telegramMediaTable)
          .set({
            storageBucket: null,
            storageKey: null,
            thumbnailKey: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(telegramMediaTable.id, media.id),
              eq(telegramMediaTable.status, "uploaded"),
              eq(telegramMediaTable.storageKey, media.storageKey),
            ),
          );
        deletedCount += 1;
        logger.info("Expired Telegram media object deleted", { mediaId: media.id });
      } catch (error) {
        failureCount += 1;
        logger.error("Failed to expire Telegram media object", {
          mediaId: media.id,
          err: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    if (expired.length < BATCH_SIZE) break;
  }

  if (deletedCount > 0 || failureCount > 0) {
    logger.info("Telegram media retention cleanup completed", {
      deletedCount,
      failureCount,
    });
  }
}

export function startTelegramMediaRetentionCleanup(): void {
  if (retentionTask) return;
  retentionTask = cron.schedule(
    "0 3 * * *",
    () => {
      void cleanupExpiredTelegramMedia().catch((error: unknown) => {
        logger.error("Telegram media retention cleanup failed", {
          err: error instanceof Error ? error.message : "Unknown error",
        });
      });
    },
    { timezone: "UTC" },
  );
  logger.info("Telegram media retention cleanup scheduled", { retentionDays: 90 });
}

export function stopTelegramMediaRetentionCleanup(): void {
  retentionTask?.stop();
  retentionTask = undefined;
}
