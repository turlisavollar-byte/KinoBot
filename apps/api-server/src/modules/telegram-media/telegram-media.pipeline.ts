import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { readdir, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { and, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import type { Bot } from "grammy";
import { db, telegramMediaTable } from "@workspace/db";
import type { BotContext } from "@/bot/index";
import { queue } from "@/infrastructure/queue/bull";
import { storage } from "@/infrastructure/storage/minio";
import { Logger } from "@/shared/utils/logger";
import { sendTelegramMediaFailureAlert } from "./telegram-media.alerts";
import {
  generateTelegramVideoPoster,
  generateTelegramVideoPosterFromStream,
  probeTelegramVideo,
} from "./telegram-media-preview";

const logger = Logger.getInstance("TelegramMediaPipeline");
const QUEUE_NAME = "telegram-media";
const RECOVERY_INTERVAL_MS = 30_000;
const POSTER_BACKFILL_INTERVAL_MS = 6 * 60 * 60 * 1000;
const POSTER_BACKFILL_BATCH_SIZE = 10;
const STALE_PROCESSING_MS = 60 * 60 * 1000;
const LOCAL_FILES_DIRECTORY = "/var/lib/telegram-bot-api";
let recoveryTimer: NodeJS.Timeout | undefined;
let posterBackfillTimer: NodeJS.Timeout | undefined;
let pipelineBot: Bot<BotContext> | undefined;
let mediaFailureAlertsRegistered = false;
let missingAlertDestinationLogged = false;

export function isTelegramMediaPipelineRunning(): boolean {
  return pipelineBot !== undefined && recoveryTimer !== undefined;
}

async function backfillMissingPosters(): Promise<void> {
  const bot = pipelineBot;
  if (!bot) return;

  const missingPosters = await db
    .select({
      id: telegramMediaTable.id,
      fileId: telegramMediaTable.fileId,
      storageBucket: telegramMediaTable.storageBucket,
      storageKey: telegramMediaTable.storageKey,
    })
    .from(telegramMediaTable)
    .where(
      and(
        eq(telegramMediaTable.status, "uploaded"),
        isNull(telegramMediaTable.thumbnailKey),
        isNotNull(telegramMediaTable.storageBucket),
        isNotNull(telegramMediaTable.storageKey),
      ),
    )
    .limit(POSTER_BACKFILL_BATCH_SIZE);

  let generated = 0;
  let failures = 0;
  for (const media of missingPosters) {
    if (!media.storageBucket || !media.storageKey) continue;
    try {
      let poster: Buffer;
      try {
        const telegramFile = await bot.api.getFile(media.fileId);
        if (!telegramFile.file_path) {
          throw new Error("Telegram did not return a local media path");
        }
        const filePath = await resolveLocalMediaPath(telegramFile.file_path);
        poster = await generateTelegramVideoPoster(filePath);
      } catch (telegramError) {
        logger.info("Telegram source unavailable; generating poster from S3", {
          mediaId: media.id,
          err: telegramError instanceof Error ? telegramError.message : "Unknown Telegram error",
        });
        const videoStream = await storage.getObjectStream(
          media.storageBucket,
          media.storageKey,
        );
        poster = await generateTelegramVideoPosterFromStream(videoStream);
      }
      const thumbnailKey = `${media.storageKey}.thumbnail.jpg`;
      await storage.uploadStream(
        media.storageBucket,
        thumbnailKey,
        Readable.from([poster]),
        "image/jpeg",
        poster.length,
      );
      const [updated] = await db
        .update(telegramMediaTable)
        .set({ thumbnailKey, updatedAt: new Date() })
        .where(
          and(
            eq(telegramMediaTable.id, media.id),
            eq(telegramMediaTable.status, "uploaded"),
            eq(telegramMediaTable.storageKey, media.storageKey),
            isNull(telegramMediaTable.thumbnailKey),
          ),
        )
        .returning({ id: telegramMediaTable.id });
      if (updated) generated += 1;
    } catch (error) {
      failures += 1;
      logger.warn("Telegram media poster backfill failed", {
        mediaId: media.id,
        err: error instanceof Error ? error.message : "Unknown poster error",
      });
    }
  }

  if (generated > 0 || failures > 0) {
    logger.info("Telegram media poster backfill completed", {
      checked: missingPosters.length,
      generated,
      failures,
    });
  }
}

async function enqueuePending(): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
  await db
    .update(telegramMediaTable)
    .set({ status: "pending", updatedAt: new Date() })
    .where(
      and(
        eq(telegramMediaTable.status, "processing"),
        lt(telegramMediaTable.updatedAt, staleBefore),
      ),
    );

  const pending = await db
    .select({ id: telegramMediaTable.id, attempts: telegramMediaTable.attempts })
    .from(telegramMediaTable)
    .where(eq(telegramMediaTable.status, "pending"))
    .limit(100);

  for (const media of pending) {
    await queue.add(
      QUEUE_NAME,
      { mediaId: media.id },
      { attempts: 3, jobId: `telegram-media-${media.id}-${media.attempts}` },
    );
  }
}

async function resolveLocalMediaPath(filePath: string): Promise<string> {
  const volumeRoot = resolve(LOCAL_FILES_DIRECTORY);
  const directPath = resolve(volumeRoot, filePath);
  const relativePath = relative(volumeRoot, directPath);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`)
  ) {
    throw new Error("Telegram Bot API media path is outside the shared local volume");
  }

  const candidates = [directPath];
  const directories = await readdir(volumeRoot, { withFileTypes: true });
  for (const directory of directories) {
    if (directory.isDirectory()) {
      candidates.push(resolve(volumeRoot, directory.name, relativePath));
    }
  }

  const existingFiles: string[] = [];
  for (const candidate of candidates) {
    const pathFromVolume = relative(volumeRoot, candidate);
    if (
      pathFromVolume === ".." ||
      pathFromVolume.startsWith(`..${sep}`)
    ) {
      continue;
    }
    try {
      if ((await stat(candidate)).isFile()) existingFiles.push(candidate);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
  }

  if (existingFiles.length !== 1) {
    throw new Error(
      existingFiles.length === 0
        ? "Telegram Bot API media file is missing from the shared local volume"
        : "Telegram Bot API media path is ambiguous in the shared local volume",
    );
  }
  return existingFiles[0];
}

async function uploadMedia(data: { mediaId: string }): Promise<void> {
  if (!pipelineBot) throw new Error("Telegram media pipeline is not initialized");
  const [media] = await db
    .select()
    .from(telegramMediaTable)
    .where(eq(telegramMediaTable.id, data.mediaId))
    .limit(1);
  if (!media || media.status === "uploaded") return;

  const bucket = process.env.VIDEO_BUCKET;
  if (!bucket) throw new Error("VIDEO_BUCKET is not configured");

  const [claimed] = await db
    .update(telegramMediaTable)
    .set({
      status: "processing",
      attempts: media.attempts + 1,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(telegramMediaTable.id, media.id),
        inArray(telegramMediaTable.status, ["pending", "failed"]),
      ),
    )
    .returning({ id: telegramMediaTable.id });
  if (!claimed) return;

  try {
    const telegramFile = await pipelineBot.api.getFile(media.fileId);
    const filePath = telegramFile.file_path;
    if (!filePath) throw new Error("Telegram did not return a local media path");

    const absolutePath = await resolveLocalMediaPath(filePath);

    const fileSize = (await stat(absolutePath)).size;
    let probedMetadata: Awaited<ReturnType<typeof probeTelegramVideo>> = {
      duration: null,
      width: null,
      height: null,
    };
    try {
      probedMetadata = await probeTelegramVideo(absolutePath);
    } catch (error) {
      logger.warn("Telegram video metadata probe unavailable", {
        mediaId: media.id,
        err: error instanceof Error ? error.message : "Unknown probe error",
      });
    }
    if (media.fileSize > 0 && fileSize !== media.fileSize) {
      throw new Error("Local media file size does not match Telegram metadata");
    }
    if (fileSize <= 0) throw new Error("Telegram media file is empty");

    const key = `telegram/${media.channelId.replace(/^-/, "")}/${media.messageId}/${media.fileUniqueId}`;
    await storage.uploadStream(
      bucket,
      key,
      createReadStream(absolutePath),
      media.mimeType,
      fileSize,
    );

    let thumbnailKey: string | null = null;
    const thumbnailFileId = media.metadata.thumbnailFileId;
    if (typeof thumbnailFileId === "string" && thumbnailFileId.length > 0) {
      try {
        const thumbnailFile = await pipelineBot.api.getFile(thumbnailFileId);
        if (!thumbnailFile.file_path) {
          throw new Error("Telegram did not return a thumbnail path");
        }
        const thumbnailPath = await resolveLocalMediaPath(thumbnailFile.file_path);
        const thumbnailSize = (await stat(thumbnailPath)).size;
        if (thumbnailSize <= 0 || thumbnailSize > 5 * 1024 * 1024) {
          throw new Error("Telegram thumbnail size is outside the accepted range");
        }
        thumbnailKey = `${key}.thumbnail.jpg`;
        await storage.uploadStream(
          bucket,
          thumbnailKey,
          createReadStream(thumbnailPath),
          "image/jpeg",
          thumbnailSize,
        );
      } catch (error) {
        logger.warn("Telegram thumbnail upload unavailable; generating a poster", {
          mediaId: media.id,
          err: error instanceof Error ? error.message : "Unknown thumbnail error",
        });
      }
    }

    if (!thumbnailKey) {
      try {
        const poster = await generateTelegramVideoPoster(absolutePath);
        thumbnailKey = `${key}.thumbnail.jpg`;
        await storage.uploadStream(
          bucket,
          thumbnailKey,
          Readable.from([poster]),
          "image/jpeg",
          poster.length,
        );
      } catch (error) {
        logger.warn("Generated Telegram video poster unavailable", {
          mediaId: media.id,
          err: error instanceof Error ? error.message : "Unknown poster error",
        });
        thumbnailKey = null;
      }
    }

    const metadata = { ...media.metadata };
    if (thumbnailKey) delete metadata.thumbnailFileId;

    await db
      .update(telegramMediaTable)
      .set({
        status: "uploaded",
        storageBucket: bucket,
        storageKey: key,
        ...(thumbnailKey ? { thumbnailKey } : {}),
        duration: media.duration ?? probedMetadata.duration,
        width: media.width ?? probedMetadata.width,
        height: media.height ?? probedMetadata.height,
        metadata,
        lastError: null,
        updatedAt: new Date(),
        uploadedAt: new Date(),
      })
      .where(eq(telegramMediaTable.id, media.id));
    logger.info("Telegram media uploaded", {
      mediaId: media.id,
      channelId: media.channelId,
      messageId: media.messageId,
      fileSize,
    });
  } catch (error) {
    await db
      .update(telegramMediaTable)
      .set({
        status: "failed",
        lastError:
          error instanceof Error ? error.message.slice(0, 1000) : "Unknown upload error",
        updatedAt: new Date(),
      })
      .where(eq(telegramMediaTable.id, media.id));
    throw error;
  }
}

export async function startTelegramMediaPipeline(
  bot: Bot<BotContext>,
): Promise<void> {
  pipelineBot = bot;
  if (!process.env.TELEGRAM_MEDIA_ALERT_CHAT_ID && !missingAlertDestinationLogged) {
    logger.warn("Telegram media alerts are disabled: destination is not configured");
    missingAlertDestinationLogged = true;
  }
  if (!mediaFailureAlertsRegistered) {
    queue.onFinalFailure(async ({ queueName, jobId }) => {
      if (queueName !== QUEUE_NAME) return;
      const destination = process.env.TELEGRAM_MEDIA_ALERT_CHAT_ID;
      if (!destination) {
        if (!missingAlertDestinationLogged) {
          logger.warn("Telegram media alerts are disabled: destination is not configured");
          missingAlertDestinationLogged = true;
        }
        return;
      }
      const activeBot = pipelineBot;
      if (!activeBot) return;
      try {
        await sendTelegramMediaFailureAlert(
          { sendMessage: (chatId, text) => activeBot.api.sendMessage(chatId, text) },
          destination,
          jobId,
        );
      } catch (error) {
        logger.error("Telegram media failure alert delivery failed", {
          jobId,
          err: error instanceof Error ? error.name : "UnknownError",
        });
      }
    });
    mediaFailureAlertsRegistered = true;
  }
  queue.register<{ mediaId: string }>(QUEUE_NAME, uploadMedia);
  queue.process(QUEUE_NAME);
  await enqueuePending();
  void backfillMissingPosters().catch((error: unknown) => {
    logger.error("Failed to backfill Telegram media posters", {
      err: error instanceof Error ? error.message : "Unknown poster error",
    });
  });

  if (!posterBackfillTimer) {
    posterBackfillTimer = setInterval(() => {
      void backfillMissingPosters().catch((error: unknown) => {
        logger.error("Failed to backfill Telegram media posters", {
          err: error instanceof Error ? error.message : "Unknown poster error",
        });
      });
    }, POSTER_BACKFILL_INTERVAL_MS);
    posterBackfillTimer.unref();
  }

  if (!recoveryTimer) {
    recoveryTimer = setInterval(() => {
      enqueuePending().catch((error: unknown) => {
        logger.error(
          "Failed to recover pending Telegram media uploads",
          { err: error instanceof Error ? error.message : "Unknown error" },
        );
      });
    }, RECOVERY_INTERVAL_MS);
    recoveryTimer.unref();
  }
}

export function stopTelegramMediaPipeline(): void {
  if (recoveryTimer) clearInterval(recoveryTimer);
  if (posterBackfillTimer) clearInterval(posterBackfillTimer);
  recoveryTimer = undefined;
  posterBackfillTimer = undefined;
  pipelineBot = undefined;
}
