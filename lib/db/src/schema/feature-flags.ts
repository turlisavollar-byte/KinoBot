import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const featureFlagsTable = pgTable("feature_flags", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("disabled"),
  rolloutPercentage: integer("rollout_percentage").notNull().default(0),
  enabledForUserIds: text("enabled_for_user_ids").array(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertFeatureFlagSchema = createInsertSchema(
  featureFlagsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlagRow = typeof featureFlagsTable.$inferSelect;
