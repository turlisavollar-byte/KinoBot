import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const devicesTable = pgTable("devices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  telegramId: text("telegram_id"),
  platform: text("platform").notNull(),
  deviceName: text("device_name").notNull(),
  deviceModel: text("device_model"),
  osVersion: text("os_version"),
  appVersion: text("app_version"),
  fcmToken: text("fcm_token"),
  status: text("status").notNull().default("active"),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type DeviceRow = typeof devicesTable.$inferSelect;
