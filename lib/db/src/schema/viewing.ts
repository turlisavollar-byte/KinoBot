import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const watchSessionsTable = pgTable("watch_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id),
  contentId: text("content_id").notNull(),
  contentType: text("content_type").notNull(),
  durationWatched: integer("duration_watched").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const watchProgressTable = pgTable("watch_progress", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id),
  contentId: text("content_id").notNull(),
  contentType: text("content_type").notNull(),
  progressSeconds: integer("progress_seconds").notNull().default(0),
  completedPercent: integer("completed_percent").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [unique().on(t.userId, t.contentId, t.contentType)]);

export const ratingsTable = pgTable("ratings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id),
  contentId: text("content_id").notNull(),
  contentType: text("content_type").notNull(),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.contentId, t.contentType)]);

export const favoritesTable = pgTable("favorites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id),
  contentId: text("content_id").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [unique().on(t.userId, t.contentId, t.contentType)]);

export type WatchSession = typeof watchSessionsTable.$inferSelect;
export type WatchProgress = typeof watchProgressTable.$inferSelect;
export type Rating = typeof ratingsTable.$inferSelect;
export type Favorite = typeof favoritesTable.$inferSelect;
