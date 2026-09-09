// lib/db/src/audit.ts

import { randomBytes } from "crypto";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Audit log table - append-only design
export const auditLogsTable = pgTable(
  "audit_logs",
  {
    // ID - string format for better readability and compatibility
    id: text("id")
      .primaryKey()
      .$defaultFn(() => {
        const timestamp = Date.now().toString(36);
        const random = randomBytes(6).toString("hex");
        return `audit_${timestamp}_${random}`;
      }),

    // Actor - who performed the action
    actorId: varchar("actor_id", { length: 255 }),
    actorType: varchar("actor_type", { length: 50 }).notNull(),
    actorEmail: varchar("actor_email", { length: 255 }),
    actorIp: varchar("actor_ip", { length: 45 }),
    actorUserAgent: text("actor_user_agent"),

    // Action - what was done
    action: varchar("action", { length: 50 }).notNull(),
    actionCategory: varchar("action_category", { length: 50 }),
    
    // Target - what was affected
    targetType: varchar("target_type", { length: 50 }).notNull(),
    targetId: varchar("target_id", { length: 255 }),
    targetName: varchar("target_name", { length: 255 }),

    // Changes - what changed
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    diff: jsonb("diff"),
    
    // Snapshot - full state before/after (for critical operations)
    snapshotBefore: jsonb("snapshot_before"),
    snapshotAfter: jsonb("snapshot_after"),

    // Context
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    requestId: varchar("request_id", { length: 255 }),
    sessionId: varchar("session_id", { length: 255 }),
    
    // Additional context
    correlationId: varchar("correlation_id", { length: 255 }),
    environment: varchar("environment", { length: 20 }),
    serviceName: varchar("service_name", { length: 100 }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    
    // Retention
    retentionDays: integer("retention_days").default(90),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => ({
    // Primary indexes
    actorIdx: index("audit_logs_actor_idx").on(
      table.actorId, 
      table.actorType
    ),
    actionIdx: index("audit_logs_action_idx").on(
      table.action,
      table.actionCategory
    ),
    targetIdx: index("audit_logs_target_idx").on(
      table.targetType,
      table.targetId
    ),
    createdAtIdx: index("audit_logs_created_at_idx").on(
      table.createdAt.desc()
    ),
    requestIdx: index("audit_logs_request_idx").on(
      table.requestId
    ),
    
    // Composite indexes for common queries
    actorTimeIdx: index("audit_logs_actor_time_idx").on(
      table.actorId,
      table.createdAt.desc()
    ),
    targetTimeIdx: index("audit_logs_target_time_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt.desc()
    ),
    
    // Partial indexes for specific use cases
    retentionIdx: index("audit_logs_retention_idx").on(
      table.createdAt
    ).where(sql`${table.archivedAt} IS NULL`),
    
    // For compliance/security audits
    complianceIdx: index("audit_logs_compliance_idx").on(
      table.action,
      table.actorType,
      table.createdAt.desc()
    ),
  })
);

// Additional table for audit log tags
export const auditLogTagsTable = pgTable(
  "audit_log_tags",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => {
        const timestamp = Date.now().toString(36);
        const random = randomBytes(4).toString("hex");
        return `tag_${timestamp}_${random}`;
      }),
    
    auditLogId: text("audit_log_id")
      .notNull()
      .references(() => auditLogsTable.id, { onDelete: "cascade" }),
    
    tag: varchar("tag", { length: 50 }).notNull(),
    value: varchar("value", { length: 255 }),
    
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    logTagIdx: index("audit_log_tags_log_idx").on(table.auditLogId),
    tagIdx: index("audit_log_tags_tag_idx").on(table.tag),
    uniqueTag: index("audit_log_tags_unique_idx").on(
      table.auditLogId,
      table.tag
    ),
  })
);

// Types
export type AuditLogRow = typeof auditLogsTable.$inferSelect;
export type NewAuditLogRow = typeof auditLogsTable.$inferInsert;
export type AuditLogTagRow = typeof auditLogTagsTable.$inferSelect;
export type NewAuditLogTagRow = typeof auditLogTagsTable.$inferInsert;

// Helper types for common operations
export type AuditLogInsert = NewAuditLogRow;
export type AuditLogSelect = AuditLogRow;

// Constants
export const AUDIT_TABLE_NAME = "audit_logs";
export const AUDIT_TAGS_TABLE_NAME = "audit_log_tags";

// Default retention periods
export const DEFAULT_RETENTION_DAYS = 90;
export const ARCHIVE_RETENTION_DAYS = 365;