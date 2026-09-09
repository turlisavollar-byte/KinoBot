import { type Bot } from "grammy";
import { eq, sql } from "drizzle-orm";
import { db, telegramConfigTable, telegramChannelsTable } from "@workspace/db";
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
    `✅ <b>File ID qabul qilindi</b>\n\n<code>${file.file_id}</code>\n\nBu ID ni admin panelida kino yoki epizodga ulash uchun foydalaning.`,
    { parse_mode: "HTML" },
  );
}

export function registerStorageHandler(bot: Bot<BotContext>) {
  // ─── Auto-register channel when bot is added as admin ────────────────────
  bot.on("my_chat_member", async (ctx) => {
    const update = ctx.myChatMember;
    const chat = update.chat;
    const newStatus = update.new_chat_member.status;

    // Only care about channels/supergroups where bot became admin
    if (chat.type !== "channel" && chat.type !== "supergroup") return;
    if (newStatus !== "administrator") return;

    const channelId = String(chat.id);
    const title = chat.title ?? channelId;

    // Upsert — don't duplicate if already registered
    const existing = await db
      .select({ id: telegramChannelsTable.id })
      .from(telegramChannelsTable)
      .where(eq(telegramChannelsTable.channelId, channelId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(telegramChannelsTable).values({
        channelId,
        title,
        type: "storage",
        isActive: true,
      });
      logger.info(
        { channelId, title },
        "Storage channel auto-registered (bot added as admin)",
      );
    } else {
      // Re-activate if it was soft-deleted
      await db
        .update(telegramChannelsTable)
        .set({ deletedAt: null, isActive: true, title })
        .where(eq(telegramChannelsTable.channelId, channelId));
      logger.info(
        { channelId, title },
        "Storage channel re-activated (bot re-added as admin)",
      );
    }
  });

  // ─── Handle media sent or forwarded directly to the bot ──────────────────
  bot.on(["message:video", "message:document"], async (ctx) => {
    const telegramId = String(ctx.from?.id);

    const file = ctx.message.video ?? ctx.message.document;
    if (!file) return;

    const fileId = file.file_id;
    const fileName =
      ctx.message.document?.file_name ?? ctx.message.video?.file_name;
    const size =
      ctx.message.document?.file_size ?? ctx.message.video?.file_size;

    logger.info(
      {
        telegramId,
        fileId,
        fileName,
        mediaType: ctx.message.video ? "video" : "document",
        forwardedFrom: ctx.message.forward_origin,
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

    const chatId = String(ctx.channelPost.chat.id);

    // Verify this is a registered storage channel
    const [channel] = await db
      .select()
      .from(telegramChannelsTable)
      .where(eq(telegramChannelsTable.channelId, chatId))
      .limit(1);

    if (!channel) return;

    const fileId = media.file_id;

    // Cache it
    rememberFile(
      fileId,
      "file_name" in media
        ? media.file_name
        : (ctx.channelPost.caption ?? undefined),
      media.file_size,
    );
    logger.info(
      { channelId: chatId, fileId, channelTitle: channel.title },
      "Media captured from storage channel",
    );

    // Increment channel file count
    await db
      .update(telegramChannelsTable)
      .set({ filesCount: sql`${telegramChannelsTable.filesCount} + 1` })
      .where(eq(telegramChannelsTable.channelId, chatId));
  });
}
