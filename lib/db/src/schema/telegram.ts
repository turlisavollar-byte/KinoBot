import {
  pgTable,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
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
