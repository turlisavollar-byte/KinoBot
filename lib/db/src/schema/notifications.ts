import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const notifications = pgTable("notifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  type: text("type").notNull(), // 'order' | 'payment' | 'shipping' | 'promotion' | 'system'
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>(),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notificationTemplatesTable = pgTable("notification_templates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  channel: text("channel").notNull().default("telegram"),
  content: text("content").notNull(),
  contentType: text("content_type").notNull().default("text"),
  mediaFileId: text("media_file_id"),
  parseMode: text("parse_mode").notNull().default("HTML"),
  buttons: jsonb("buttons").$type<Array<{ text: string; url: string }>>(),
  variables: text("variables").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const broadcastJobsTable = pgTable("broadcast_jobs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  templateId: text("template_id")
    .notNull()
    .references(() => notificationTemplatesTable.id),
  targetAudience: text("target_audience").notNull().default("all"),
  variables: text("variables"),
  status: text("status").notNull().default("pending"),
  totalRecipients: integer("total_recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationTemplateSchema = createInsertSchema(
  notificationTemplatesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type NotificationTemplate =
  typeof notificationTemplatesTable.$inferSelect;
export type BroadcastJob = typeof broadcastJobsTable.$inferSelect;
