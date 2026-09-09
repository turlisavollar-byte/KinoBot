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

export const usersTable = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  telegramId: text("telegram_id").notNull().unique(),
  email: text("email").unique(),
  phone: text("phone"),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  languageCode: text("language_code").notNull().default("en"),
  status: text("status").notNull().default("active"),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  isBlocked: boolean("is_blocked").notNull().default(false),
  blockedReason: text("blocked_reason"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  referralCode: text("referral_code")
    .unique()
    .$defaultFn(() => Math.random().toString(36).substring(2, 8).toUpperCase()),
  referredBy: text("referred_by"),
  referralRewardTier: integer("referral_reward_tier").notNull().default(0),
  acquisitionSource: text("acquisition_source"),
  dailyCodeLimit: integer("daily_code_limit"),
  dailyCodeUsed: integer("daily_code_used").notNull().default(0),
  dailyCodeResetAt: timestamp("daily_code_reset_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  weeklyCodeLimit: integer("weekly_code_limit"),
  weeklyCodeUsed: integer("weekly_code_used").notNull().default(0),
  weeklyCodeResetAt: timestamp("weekly_code_reset_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  monthlyCodeLimit: integer("monthly_code_limit"),
  monthlyCodeUsed: integer("monthly_code_used").notNull().default(0),
  monthlyCodeResetAt: timestamp("monthly_code_reset_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  trialExpiresAt: timestamp("trial_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const userProfilesTable = pgTable("user_profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  coverImage: text("cover_image"),
  location: text("location"),
  website: text("website"),
  birthDate: timestamp("birth_date", { withTimezone: true }),
  gender: text("gender"),
  preferences: jsonb("preferences").$type<Record<string, unknown>>(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userStatsTable = pgTable("user_stats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  totalWatchTime: integer("total_watch_time").notNull().default(0),
  totalWatchSessions: integer("total_watch_sessions").notNull().default(0),
  totalMoviesWatched: integer("total_movies_watched").notNull().default(0),
  totalSeriesWatched: integer("total_series_watched").notNull().default(0),
  totalEpisodesWatched: integer("total_episodes_watched").notNull().default(0),
  totalFavorites: integer("total_favorites").notNull().default(0),
  totalRatings: integer("total_ratings").notNull().default(0),
  averageRating: integer("average_rating").notNull().default(0),
  lastWatchDate: timestamp("last_watch_date", { withTimezone: true }),
  activeStreak: integer("active_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  totalSubscriptions: integer("total_subscriptions").notNull().default(0),
  activeSubscriptionCount: integer("active_subscription_count")
    .notNull()
    .default(0),
  totalReferrals: integer("total_referrals").notNull().default(0),
  referralRewards: integer("referral_rewards").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
