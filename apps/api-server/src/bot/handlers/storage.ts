import { type Bot } from "grammy";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, telegramConfigTable, telegramChannelsTable, telegramMediaTable } from "@workspace/db";
import { queue } from "@/infrastructure/queue/bull";
import type { BotContext } from "@/bot/index";
import { logger } from "@/lib/logger";

/**
 * Storage channel handler.
 *
 * - When an admin forwards/uploads a video to the bot, captures file_id.
 * - When bot is added as admin to a channel, auto-registers it.
 * - When a video is posted in a registered channel, captures file_id.
 */

// In-memory cache of recently captured file_ids (for dashboard retrieval)
const recentFileIds: Array<{
  fileId: string;
  fileName?: string;
  size?: number;
  capturedAt: Date;
}> = [];
const MAX_CACHED = 50;

function isVideoDocument(
  document: { mime_type?: string } | undefined,
): boolean {
  return Boolean(document?.mime_type?.toLowerCase().startsWith("video/"));
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

export function getRecentFileIds() {
  return [...recentFileIds];
}

function rememberFile(fileId: string, fileName?: string, size?: number) {
  recentFileIds.unshift({ fileId, fileName, size, capturedAt: new Date() });
  if (recentFileIds.length > MAX_CACHED) recentFileIds.pop();
}

async function replyWithFileId(
  ctx: BotContext,
  file: {
    file_id: string;
    file_name?: string;
    file_size?: number;
  },
) {
  rememberFile(file.file_id, file.file_name, file.file_size);
  await ctx.reply(
    `✅ <b>File ID qabul qilindi</b>\n\n<code>${escapeHtml(file.file_id)}</code>\n\nBu ID ni admin panelida kino yoki epizodga ulash uchun foydalaning.`,
    { parse_mode: "HTML" },
  );
}

export function registerStorageHandler(bot: Bot<BotContext>) {
  // ─── Auto-register channel when bot is added as admin ────────────────────
  bot.on("my_chat_member", async (ctx) => {
    const update = ctx.myChatMember;
    const chat = update.chat;
    const newStatus = update.new_chat_member.status;

    // Only care about channels/supergroups where the bot can read channel posts.
    if (chat.type !== "channel" && chat.type !== "supergroup") return;

    const channelId = String(chat.id);
    const title = chat.title ?? channelId;

    if (newStatus === "left" || newStatus === "kicked") {
      await db
        .update(telegramChannelsTable)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(telegramChannelsTable.channelId, channelId));
      logger.info({ channelId, title }, "Storage channel deactivated");
      return;
    }

    if (newStatus !== "administrator" && newStatus !== "creator") return;

    await db
      .insert(telegramChannelsTable)
      .values({ channelId, title, type: "storage", isActive: true })
      .onConflictDoUpdate({
        target: telegramChannelsTable.channelId,
        set: { deletedAt: null, isActive: true, title },
      });
    logger.info(
      { channelId, title, status: newStatus },
      "Storage channel registered or re-activated",
    );
  });

  // ─── Handle media sent or forwarded directly to the bot ──────────────────
  bot.on(["message:video", "message:document"], async (ctx) => {
    const telegramId = String(ctx.from?.id ?? "unknown");

    const file = ctx.message.video ?? ctx.message.document;
    if (!file) return;

    if (!ctx.message.video && !isVideoDocument(ctx.message.document)) {
      await ctx.reply("⚠️ Faqat video fayllar qabul qilinadi.");
      return;
    }

    const fileId = file.file_id;
    const fileName =
      ctx.message.document?.file_name ?? ctx.message.video?.file_name;
    const size =
      ctx.message.document?.file_size ?? ctx.message.video?.file_size;

    logger.info(
      {
        telegramId,
        fileName,
        mediaType: ctx.message.video ? "video" : "document",
        forwardType: ctx.message.forward_origin?.type,
      },
      "File captured from bot message",
    );

    await replyWithFileId(ctx, {
      file_id: fileId,
      file_name: fileName,
      file_size: size,
    });
  });

  // ─── Handle channel_post events (video posted in storage channel) ─────────
  bot.on(["channel_post:video", "channel_post:document"], async (ctx) => {
    const media = ctx.channelPost.video ?? ctx.channelPost.document;
    if (!media) return;

    if (!ctx.channelPost.video && !isVideoDocument(ctx.channelPost.document)) {
      return;
    }

    const chatId = String(ctx.channelPost.chat.id);

    // Verify this is a registered storage channel
    const [channel] = await db
      .select()
      .from(telegramChannelsTable)
      .where(
        and(
          eq(telegramChannelsTable.channelId, chatId),
          eq(telegramChannelsTable.isActive, true),
          isNull(telegramChannelsTable.deletedAt),
        ),
      )
      .limit(1);

    if (!channel) return;

    const fileId = media.file_id;
    const fileName = "file_name" in media ? media.file_name : undefined;
    const [inserted] = await db
      .insert(telegramMediaTable)
      .values({
        channelId: chatId,
        messageId: ctx.channelPost.message_id,
        fileId,
        fileUniqueId: media.file_unique_id,
        fileName: fileName ?? null,
        mimeType: media.mime_type ?? (ctx.channelPost.video ? "video/mp4" : "application/octet-stream"),
        fileSize: media.file_size ?? 0,
        duration: ctx.channelPost.video?.duration ?? null,
        width: ctx.channelPost.video?.width ?? null,
        height: ctx.channelPost.video?.height ?? null,
        caption: ctx.channelPost.caption ?? null,
        metadata: {
          mediaType: ctx.channelPost.video ? "video" : "document",
          ...(ctx.channelPost.video?.thumbnail
            ? { thumbnailFileId: ctx.channelPost.video.thumbnail.file_id }
            : {}),
        },
      })
      .onConflictDoNothing({
        target: [telegramMediaTable.channelId, telegramMediaTable.messageId],
      })
      .returning({ id: telegramMediaTable.id });

    if (!inserted) return;
    rememberFile(fileId, fileName, media.file_size);
    await queue.add(
      "telegram-media",
      { mediaId: inserted.id },
      { attempts: 3, jobId: `telegram-media-${inserted.id}-0` },
    );
    logger.info(
      { channelId: chatId, messageId: ctx.channelPost.message_id, channelTitle: channel.title },
      "Media recorded for durable upload",
    );

    await db
      .update(telegramChannelsTable)
      .set({ filesCount: sql`${telegramChannelsTable.filesCount} + 1` })
      .where(eq(telegramChannelsTable.channelId, chatId));
  });
}
