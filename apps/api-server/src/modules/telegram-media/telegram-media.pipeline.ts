import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { and, eq, inArray, lt } from "drizzle-orm";
import type { Bot } from "grammy";
import { db, telegramMediaTable } from "@workspace/db";
import type { BotContext } from "@/bot/index";
import { queue } from "@/infrastructure/queue/bull";
import { storage } from "@/infrastructure/storage/minio";
import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("TelegramMediaPipeline");
const QUEUE_NAME = "telegram-media";
const RECOVERY_INTERVAL_MS = 30_000;
const STALE_PROCESSING_MS = 60 * 60 * 1000;
const LOCAL_FILES_DIRECTORY = "/var/lib/telegram-bot-api";
let recoveryTimer: NodeJS.Timeout | undefined;
let pipelineBot: Bot<BotContext> | undefined;

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
    .where(inArray(telegramMediaTable.status, ["pending", "failed"]))
    .limit(100);

  for (const media of pending) {
    await queue.add(
      QUEUE_NAME,
      { mediaId: media.id },
      { attempts: 3, jobId: `telegram-media-${media.id}-${media.attempts}` },
    );
  }
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

    const absolutePath = resolve(filePath);
    const pathFromVolume = relative(LOCAL_FILES_DIRECTORY, absolutePath);
    if (
      pathFromVolume === "" ||
      pathFromVolume === ".." ||
      pathFromVolume.startsWith(`..${sep}`) ||
      resolve(LOCAL_FILES_DIRECTORY, pathFromVolume) !== absolutePath
    ) {
      throw new Error("Telegram Bot API media path is outside the shared local volume");
    }

    const fileSize = (await stat(absolutePath)).size;
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
    await db
      .update(telegramMediaTable)
      .set({
        status: "uploaded",
        storageBucket: bucket,
        storageKey: key,
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
  queue.register<{ mediaId: string }>(QUEUE_NAME, uploadMedia);
  queue.process(QUEUE_NAME);
  await enqueuePending();

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
  recoveryTimer = undefined;
  pipelineBot = undefined;
}
