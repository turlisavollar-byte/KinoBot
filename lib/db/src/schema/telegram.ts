import {
  pgTable,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const telegramConfigTable = pgTable("telegram_config", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  botToken: text("bot_token"),
  botUsername: text("bot_username"),
  defaultChannelId: text("default_channel_id"),
  isActive: boolean("is_active").notNull().default(false),
  webhookUrl: text("webhook_url"),
  // Public channel users must subscribe to before watching videos.
  // Set to a channel @username (e.g. "@mychannelname") or numeric ID (e.g. "-1001234567890").
  requiredChannelId: text("required_channel_id"),
  defaultDailyCodeLimit: integer("default_daily_code_limit"),
  defaultWeeklyCodeLimit: integer("default_weekly_code_limit"),
  defaultMonthlyCodeLimit: integer("default_monthly_code_limit"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const telegramChannelsTable = pgTable("telegram_channels", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  channelId: text("channel_id").notNull().unique(),
  title: text("title").notNull(),
  type: text("type").notNull().default("storage"),
  isActive: boolean("is_active").notNull().default(true),
  filesCount: integer("files_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const telegramMessagesTable = pgTable("telegram_messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  messageId: bigint("message_id", { mode: "number" }),
  chatId: text("chat_id").notNull(),
  text: text("text"),
  type: text("type").notNull().default("text"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const telegramMediaTable = pgTable(
  "telegram_media",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    channelId: text("channel_id").notNull(),
    messageId: bigint("message_id", { mode: "number" }).notNull(),
    fileId: text("file_id").notNull(),
    fileUniqueId: text("file_unique_id").notNull(),
    fileName: text("file_name"),
    mimeType: text("mime_type").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    duration: integer("duration"),
    width: integer("width"),
    height: integer("height"),
    caption: text("caption"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("pending"),
    storageBucket: text("storage_bucket"),
    storageKey: text("storage_key"),
    thumbnailKey: text("thumbnail_key"),
    viewsCount: bigint("views_count", { mode: "number" }).notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
  },
  (table) => ({
    channelMessageUnique: uniqueIndex("telegram_media_channel_message_uidx").on(
      table.channelId,
      table.messageId,
    ),
    statusCreatedIdx: index("telegram_media_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
    statusUploadedIdx: index("telegram_media_status_uploaded_idx").on(
      table.status,
      table.uploadedAt,
    ),
  }),
);

export const insertTelegramConfigSchema = createInsertSchema(
  telegramConfigTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertTelegramChannelSchema = createInsertSchema(
  telegramChannelsTable,
).omit({
  id: true,
  createdAt: true,
  deletedAt: true,
});

export type TelegramConfig = typeof telegramConfigTable.$inferSelect;
export type TelegramChannel = typeof telegramChannelsTable.$inferSelect;

export type TelegramMedia = typeof telegramMediaTable.$inferSelect;
