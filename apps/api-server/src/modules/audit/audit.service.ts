// modules/audit/audit.service.ts
import type {
  AuditLog,
  AuditLogListResponse,
  AuditLogQueryOptions,
  AuditLogStatistics,
  AuditLogExportOptions,
  AuditLogRetentionPolicy,
  CreateAuditLogDTO,
  AuditAction,
  AuditActorType,
  AuditTargetType,
} from "./audit.types";

import type {
  AuditLogRow,
  NewAuditLogRow,
  AuditLogTagRow,
  NewAuditLogTagRow,
} from "@workspace/db";

import {
  db,
  auditLogsTable,
  auditLogTagsTable,
} from "@workspace/db";

import {
  and,
  count,
  desc,
  eq,
  gte,
  lte,
  like,
  or,
  sql,
  isNull,
  isNotNull,
  inArray,
  between,
} from "drizzle-orm";

import { randomBytes } from "node:crypto";
import { Logger } from "@/shared/utils/logger";

// Constants
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_RETENTION_DAYS = 90;

// Custom error classes
export class AuditError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AuditError";
  }
}

export class AuditValidationError extends AuditError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", details);
  }
}

export class AuditNotFoundError extends AuditError {
  constructor(id: string) {
    super(`Audit log with id ${id} not found`, "NOT_FOUND", { id });
  }
}

/**
 * Generate audit ID in format: audit_{timestamp}_{random}
 * Human-readable and collision-resistant
 */
function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString("hex");
  return `audit_${timestamp}_${random}`;
}

/**
 * Main Audit Service
 * Enterprise-grade audit logging with comprehensive features
 */
export class AuditService {
  private readonly logger = new Logger("AuditService");
  private readonly isProduction = process.env.NODE_ENV === "production";

  /**
   * Create a new audit log entry
   * @param dto - Audit log data
   * @returns Created audit log
   * @throws AuditValidationError if validation fails
   */
  async log(dto: CreateAuditLogDTO): Promise<AuditLog> {
    const startTime = Date.now();

    try {
      // Validate
      this.validateLogDTO(dto);

      // Prepare row
      const row: NewAuditLogRow = {
        id: generateAuditId(),
        
        // Actor
        actorId: dto.actorId,
        actorType: dto.actorType,
        actorEmail: dto.actorEmail,
        actorIp: dto.metadata?.ipAddress as string,
        actorUserAgent: dto.metadata?.userAgent as string,
        
        // Action
        action: dto.action,
        actionCategory: this.categorizeAction(dto.action),
        
        // Target
        targetType: dto.targetType,
        targetId: dto.targetId,
        targetName: dto.targetName,
        
        // Changes
        oldValue: dto.oldValue,
        newValue: dto.newValue,
        diff: this.calculateDiff(dto.oldValue, dto.newValue),
        
        // Context
        metadata: {
          ...dto.metadata,
          severity: dto.severity || "LOW",
          tags: dto.tags || [],
        },
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        requestId: dto.requestId,
        sessionId: dto.sessionId,
        
        // Additional fields
        environment: process.env.NODE_ENV,
        serviceName: process.env.SERVICE_NAME || "api-server",
        retentionDays: DEFAULT_RETENTION_DAYS,
        
        // Timestamps
        createdAt: new Date(),
      };

      // Insert main log
      const [inserted] = await db
        .insert(auditLogsTable)
        .values(row)
        .returning();

      if (!inserted) {
        throw new AuditError(
          "Failed to create audit log",
          "INSERT_FAILED"
        );
      }

      // Insert tags if provided
      if (dto.tags && dto.tags.length > 0) {
        await this.insertTags(inserted.id, dto.tags);
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`Audit log created in ${duration}ms`, {
        id: inserted.id,
        action: dto.action,
      });

      return this.mapRowToAuditLog(inserted);

    } catch (error) {
      this.logger.error("Failed to create audit log", { error, dto });
      
      // NEVER throw errors in production - audit failures should not crash the application
      // Instead, log to fallback mechanism (console/file) for later recovery
      if (this.isProduction) {
        // Fallback logging for production
        console.error('[AUDIT_FALLBACK] Failed to create audit log:', {
          timestamp: new Date().toISOString(),
          dto: JSON.stringify(dto),
          error: error instanceof Error ? error.message : String(error),
        });
        
        // Return a minimal audit log object to maintain API contract
        return {
          id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          actorId: dto.actorId,
          actorType: dto.actorType,
          action: dto.action,
          targetType: dto.targetType,
          targetId: dto.targetId,
          targetName: dto.targetName,
          metadata: {
            ...dto.metadata,
            _fallback: true,
            _error: error instanceof Error ? error.message : String(error),
          },
          createdAt: new Date(),
          createdAtIso: new Date().toISOString(),
        } as any;
      }
      
      // In development, throw to surface issues early
      throw error;
    }
  }

  /**
   * List audit logs with advanced filtering and cursor pagination
   */
  async list(options: AuditLogQueryOptions = {}): Promise<AuditLogListResponse> {
    try {
      const limit = this.normalizeLimit(options.limit);
      const conditions = await this.buildConditions(options);

      // Build base query conditions
      const allConditions = [...conditions];
      
      // If search is provided, add search conditions
      if (options.search) {
        const searchConditions = this.buildSearchConditions(options.search);
        if (searchConditions.length > 0) {
          allConditions.push(...searchConditions);
        }
      }

      // Build base query
      const query = db
        .select()
        .from(auditLogsTable)
        .where(allConditions.length > 0 ? and(...allConditions) : undefined)
        .orderBy(
          desc(auditLogsTable.createdAt),
          desc(auditLogsTable.id)
        )
        .limit(limit + 1);

      const rows = await query;

      // Count total if requested
      let total: number | undefined;
      if (options.includeTotal) {
        const [countResult] = await db
          .select({ count: count() })
          .from(auditLogsTable)
          .where(conditions.length > 0 ? and(...conditions) : undefined);
        total = countResult?.count || 0;
      }

      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit);
      const lastItem = items.length > 0 ? items[items.length - 1] : undefined;

      return {
        data: await Promise.all(
          items.map((row) => this.mapRowToAuditLogWithTags(row))
        ),
        meta: {
          limit,
          nextCursor: hasMore && lastItem ? lastItem.id : undefined,
          hasMore,
          total,
          filteredCount: items.length,
        },
      };

    } catch (error) {
      this.logger.error("Failed to list audit logs", { error, options });
      throw new AuditError(
        "Failed to retrieve audit logs",
        "LIST_FAILED",
        { error }
      );
    }
  }

  /**
   * Get audit log by ID with tags
   */
  async getById(id: string): Promise<AuditLog | null> {
    try {
      const [row] = await db
        .select()
        .from(auditLogsTable)
        .where(eq(auditLogsTable.id, id))
        .limit(1);

      if (!row) {
        return null;
      }

      return this.mapRowToAuditLogWithTags(row);

    } catch (error) {
      this.logger.error("Failed to get audit log", { error, id });
      throw new AuditError(
        "Failed to retrieve audit log",
        "GET_FAILED",
        { error, id }
      );
    }
  }

  /**
   * Get audit log by ID or throw
   */
  async getByIdOrThrow(id: string): Promise<AuditLog> {
    const log = await this.getById(id);
    if (!log) {
      throw new AuditNotFoundError(id);
    }
    return log;
  }

  /**
   * Search audit logs with full-text search
   */
  async search(
    query: string,
    options: AuditLogQueryOptions = {}
  ): Promise<AuditLogListResponse> {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      return this.list(options);
    }

    return this.list({
      ...options,
      search: trimmedQuery,
    });
  }

  /**
   * Get statistics for audit logs
   */
  async getStatistics(
    startDate: Date,
    endDate: Date,
    options?: {
      groupBy?: ("action" | "actorType" | "targetType" | "hour" | "day")[];
      includeInsights?: boolean;
    }
  ): Promise<AuditLogStatistics> {
    if (startDate > endDate) {
      throw new AuditValidationError(
        "startDate must be before endDate",
        { startDate, endDate }
      );
    }

    try {
      const where = and(
        gte(auditLogsTable.createdAt, startDate),
        lte(auditLogsTable.createdAt, endDate)
      );

      // Run all queries in parallel
      const [
        totalResult,
        byAction,
        byActorType,
        byTargetType,
        bySeverity,
        insights,
      ] = await Promise.all([
        // Total count
        db
          .select({ count: count() })
          .from(auditLogsTable)
          .where(where),

        // By action
        db
          .select({
            action: auditLogsTable.action,
            count: count(),
          })
          .from(auditLogsTable)
          .where(where)
          .groupBy(auditLogsTable.action)
          .orderBy(desc(count())),

        // By actor type
        db
          .select({
            actorType: auditLogsTable.actorType,
            count: count(),
          })
          .from(auditLogsTable)
          .where(where)
          .groupBy(auditLogsTable.actorType)
          .orderBy(desc(count())),

        // By target type
        db
          .select({
            targetType: auditLogsTable.targetType,
            count: count(),
          })
          .from(auditLogsTable)
          .where(where)
          .groupBy(auditLogsTable.targetType)
          .orderBy(desc(count())),

        // By severity (if available)
        db
          .select({
            severity: sql<string>`metadata->>'severity'`,
            count: count(),
          })
          .from(auditLogsTable)
          .where(
            and(
              where,
              isNotNull(sql`metadata->>'severity'`)
            )
          )
          .groupBy(sql`metadata->>'severity'`),

        // Insights (if requested)
        options?.includeInsights
          ? this.calculateInsights(startDate, endDate, where)
          : Promise.resolve(undefined),
      ]);

      return {
        total: totalResult[0]?.count ?? 0,
        byAction: Object.fromEntries(
          byAction.map((item) => [item.action, item.count])
        ) as Record<AuditAction, number>,
        byActorType: Object.fromEntries(
          byActorType.map((item) => [item.actorType, item.count])
        ) as Record<AuditActorType, number>,
        byTargetType: Object.fromEntries(
          byTargetType.map((item) => [item.targetType, item.count])
        ) as Record<AuditTargetType, number>,
        bySeverity: Object.fromEntries(
          bySeverity.map((item) => [item.severity as any, item.count])
        ),
        period: { start: startDate, end: endDate },
        insights,
      };

    } catch (error) {
      this.logger.error("Failed to get statistics", { error, startDate, endDate });
      throw new AuditError(
        "Failed to retrieve statistics",
        "STATISTICS_FAILED",
        { error }
      );
    }
  }

  /**
   * Export audit logs to CSV/JSON format
   */
  async export(options: AuditLogExportOptions): Promise<{
    format: string;
    data: string;
    filename: string;
    contentType: string;
  }> {
    const { format, startDate, endDate, filters = {} } = options;

    // Build query
    const conditions = [
      gte(auditLogsTable.createdAt, startDate),
      lte(auditLogsTable.createdAt, endDate),
    ];

    if (filters.actorId) {
      conditions.push(eq(auditLogsTable.actorId, filters.actorId));
    }
    if (filters.action) {
      conditions.push(eq(auditLogsTable.action, filters.action));
    }

    const rows = await db
      .select()
      .from(auditLogsTable)
      .where(and(...conditions))
      .orderBy(desc(auditLogsTable.createdAt));

    const data = rows.map((row) => this.mapRowToAuditLog(row));

    // Format data
    let formattedData: string;
    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case "csv":
        formattedData = this.toCSV(data);
        contentType = "text/csv";
        fileExtension = "csv";
        break;
      case "json":
        formattedData = JSON.stringify(data, null, 2);
        contentType = "application/json";
        fileExtension = "json";
        break;
      default:
        throw new AuditValidationError(`Unsupported format: ${format}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `audit-logs_${timestamp}.${fileExtension}`;

    return {
      format,
      data: formattedData,
      filename,
      contentType,
    };
  }

  /**
   * Delete audit logs older than specified date
   * Returns count of deleted logs
   */
  async deleteOlderThan(date: Date): Promise<number> {
    try {
      // First, archive old logs if needed
      const archived = await this.archiveLogs(date);

      // Then delete
      const deleted = await db
        .delete(auditLogsTable)
        .where(
          and(
            lte(auditLogsTable.createdAt, date),
            isNull(auditLogsTable.archivedAt)
          )
        )
        .returning({ id: auditLogsTable.id });

      this.logger.info(`Deleted ${deleted.length} audit logs older than ${date.toISOString()}`);

      return deleted.length;

    } catch (error) {
      this.logger.error("Failed to delete old logs", { error, date });
      throw new AuditError(
        "Failed to delete old audit logs",
        "DELETE_FAILED",
        { error, date }
      );
    }
  }

  /**
   * Archive audit logs (mark as archived)
   */
  async archiveLogs(date: Date): Promise<number> {
    const archived = await db
      .update(auditLogsTable)
      .set({
        archivedAt: new Date(),
        retentionDays: DEFAULT_RETENTION_DAYS + 90,
      })
      .where(
        and(
          lte(auditLogsTable.createdAt, date),
          isNull(auditLogsTable.archivedAt)
        )
      )
      .returning({ id: auditLogsTable.id });

    this.logger.info(`Archived ${archived.length} audit logs`);

    return archived.length;
  }

  /**
   * Apply retention policy
   */
  async applyRetentionPolicy(policy: AuditLogRetentionPolicy): Promise<{
    archived: number;
    deleted: number;
  }> {
    const now = new Date();
    const archiveDate = new Date(now);
    archiveDate.setDate(archiveDate.getDate() - policy.archiveAfterDays);

    const deleteDate = new Date(now);
    deleteDate.setDate(deleteDate.getDate() - policy.deleteAfterDays);

    const [archived, deleted] = await Promise.all([
      this.archiveLogs(archiveDate),
      this.deleteOlderThan(deleteDate),
    ]);

    return { archived, deleted };
  }

  /**
   * Get audit log timeline for a specific entity
   */
  async getTimeline(
    targetType: string,
    targetId: string,
    limit = 50
  ): Promise<AuditLog[]> {
    const rows = await db
      .select()
      .from(auditLogsTable)
      .where(
        and(
          eq(auditLogsTable.targetType, targetType),
          eq(auditLogsTable.targetId, targetId)
        )
      )
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit);

    return Promise.all(rows.map((row) => this.mapRowToAuditLogWithTags(row)));
  }

  /**
   * Get audit trail for a specific user
   */
  async getUserTrail(userId: string, limit = 100): Promise<AuditLog[]> {
    const rows = await db
      .select()
      .from(auditLogsTable)
      .where(
        or(
          eq(auditLogsTable.actorId, userId),
          eq(auditLogsTable.targetId, userId)
        )
      )
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit);

    return Promise.all(rows.map((row) => this.mapRowToAuditLogWithTags(row)));
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Build search conditions for full-text search
   */
  private buildSearchConditions(searchTerm: string): any[] {
    const searchValue = `%${searchTerm}%`;
    
    return [
      or(
        like(auditLogsTable.actorEmail, searchValue),
        like(auditLogsTable.actorId, searchValue),
        like(auditLogsTable.targetName, searchValue),
        like(auditLogsTable.targetId, searchValue),
        like(auditLogsTable.requestId, searchValue),
        like(auditLogsTable.ipAddress, searchValue),
        like(auditLogsTable.action, searchValue),
        like(auditLogsTable.targetType, searchValue),
        like(sql<string>`metadata::text`, searchValue)
      ),
    ];
  }

  /**
   * Build query conditions from options
   */
  private async buildConditions(
    options: AuditLogQueryOptions
  ): Promise<any[]> {
    const conditions = [];

    if (options.actorId) {
      conditions.push(eq(auditLogsTable.actorId, options.actorId));
    }

    if (options.actorType) {
      conditions.push(eq(auditLogsTable.actorType, options.actorType));
    }

    if (options.action) {
      conditions.push(eq(auditLogsTable.action, options.action));
    }

    if (options.actionCategory) {
      conditions.push(eq(auditLogsTable.actionCategory, options.actionCategory));
    }

    if (options.targetType) {
      conditions.push(eq(auditLogsTable.targetType, options.targetType));
    }

    if (options.targetId) {
      conditions.push(eq(auditLogsTable.targetId, options.targetId));
    }

    if (options.startDate) {
      conditions.push(gte(auditLogsTable.createdAt, options.startDate));
    }

    if (options.endDate) {
      conditions.push(lte(auditLogsTable.createdAt, options.endDate));
    }

    if (options.severity) {
      conditions.push(
        sql`metadata->>'severity' = ${options.severity}`
      );
    }

    if (options.tags && options.tags.length > 0) {
      // Search for logs with specific tags
      const tagConditions = await Promise.all(
        options.tags.map(async (tag) => {
          const tagRows = await db
            .select({ logId: auditLogTagsTable.auditLogId })
            .from(auditLogTagsTable)
            .where(eq(auditLogTagsTable.tag, tag));
          
          const logIds = tagRows.map((r) => r.logId);
          return logIds.length > 0 ? inArray(auditLogsTable.id, logIds) : undefined;
        })
      );

      const validTagConditions = tagConditions.filter((c) => c !== undefined);
      if (validTagConditions.length > 0) {
        conditions.push(and(...validTagConditions));
      }
    }

    // Cursor pagination
    if (options.cursor) {
      const [cursorLog] = await db
        .select({
          id: auditLogsTable.id,
          createdAt: auditLogsTable.createdAt,
        })
        .from(auditLogsTable)
        .where(eq(auditLogsTable.id, options.cursor))
        .limit(1);

      if (cursorLog) {
        conditions.push(
          sql`(
            ${auditLogsTable.createdAt} < ${cursorLog.createdAt}
            OR (
              ${auditLogsTable.createdAt} = ${cursorLog.createdAt}
              AND ${auditLogsTable.id} < ${cursorLog.id}
            )
          )`
        );
      }
    }

    // Archived filter
    if (!options.includeArchived) {
      conditions.push(isNull(auditLogsTable.archivedAt));
    }

    return conditions;
  }

  /**
   * Insert tags for an audit log
   */
  private async insertTags(logId: string, tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) return;

    const tagRows: NewAuditLogTagRow[] = tags.map((tag) => ({
      id: `tag_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`,
      auditLogId: logId,
      tag,
      createdAt: new Date(),
    }));

    await db.insert(auditLogTagsTable).values(tagRows);
  }

  /**
   * Get tags for an audit log
   */
  private async getTagsForLog(logId: string): Promise<string[]> {
    const rows = await db
      .select({ tag: auditLogTagsTable.tag })
      .from(auditLogTagsTable)
      .where(eq(auditLogTagsTable.auditLogId, logId));

    return rows.map((row) => row.tag);
  }

  /**
   * Map database row to AuditLog with tags
   */
  private async mapRowToAuditLogWithTags(row: AuditLogRow): Promise<AuditLog> {
    const log = this.mapRowToAuditLog(row);
    const tags = await this.getTagsForLog(row.id);
    return {
      ...log,
      tags,
    };
  }

  /**
   * Map database row to AuditLog
   */
  private mapRowToAuditLog(row: AuditLogRow): AuditLog {
    return {
      id: row.id,
      
      // Actor
      actorId: row.actorId ?? undefined,
      actorType: row.actorType as any,
      actorEmail: row.actorEmail ?? undefined,
      
      // Action
      action: row.action as any,
      
      // Target
      targetType: row.targetType as any,
      targetId: row.targetId ?? undefined,
      targetName: row.targetName ?? undefined,
      
      // Changes
      oldValue: (row.oldValue as Record<string, unknown>) ?? undefined,
      newValue: (row.newValue as Record<string, unknown>) ?? undefined,
      diff: (row.diff as Record<string, { old: unknown; new: unknown }>) ?? undefined,
      
      // Context
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      ipAddress: row.ipAddress ?? undefined,
      userAgent: row.userAgent ?? undefined,
      requestId: row.requestId ?? undefined,
      sessionId: row.sessionId ?? undefined,
      
      // Timestamps
      createdAt: row.createdAt,
      createdAtIso: row.createdAt.toISOString(),
      
      // Additional
      severity: (row.metadata as any)?.severity,
    };
  }

  /**
   * Calculate diff between old and new values
   */
  private calculateDiff(
    oldValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>
  ): Record<string, { old: unknown; new: unknown }> | undefined {
    if (!oldValue || !newValue) return undefined;

    const diff: Record<string, { old: unknown; new: unknown }> = {};
    const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

    for (const key of keys) {
      const oldItem = oldValue[key];
      const newItem = newValue[key];

      if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        diff[key] = { old: oldItem, new: newItem };
      }
    }

    return Object.keys(diff).length > 0 ? diff : undefined;
  }

  /**
   * Categorize action for better grouping
   */
  private categorizeAction(action: string): string {
    const categories: Record<string, string[]> = {
      CRUD: ["CREATE", "READ", "UPDATE", "DELETE", "UPSERT"],
      AUTH: ["LOGIN", "LOGOUT", "LOGIN_FAILED", "REGISTER", "VERIFY_EMAIL", "RESET_PASSWORD"],
      PAYMENT: ["PAYMENT_COMPLETED", "PAYMENT_FAILED", "PAYMENT_REFUNDED", "SUBSCRIPTION_CREATED", "SUBSCRIPTION_CANCELLED"],
      SYSTEM: ["SYSTEM_START", "SYSTEM_STOP", "ERROR", "WARNING"],
      SECURITY: ["SECURITY_ALERT", "COMPLIANCE_CHECK"],
      ADMIN: ["ROLE_CHANGED", "PERMISSION_CHANGED", "CONFIG_CHANGED"],
    };

    for (const [category, actions] of Object.entries(categories)) {
      if (actions.includes(action)) {
        return category;
      }
    }

    return "OTHER";
  }

  /**
   * Normalize limit to safe range
   */
  private normalizeLimit(limit?: number): number {
    if (!Number.isFinite(limit) || !limit || limit < 1) {
      return DEFAULT_LIMIT;
    }
    return Math.min(Math.floor(limit), MAX_LIMIT);
  }

  /**
   * Validate DTO
   */
  private validateLogDTO(dto: CreateAuditLogDTO): void {
    const errors: Record<string, string> = {};

    if (!dto.actorType) {
      errors.actorType = "actorType is required";
    }

    if (!dto.action) {
      errors.action = "action is required";
    }

    if (!dto.targetType) {
      errors.targetType = "targetType is required";
    }

    if (Object.keys(errors).length > 0) {
      throw new AuditValidationError("Validation failed", errors);
    }
  }

  /**
   * Calculate insights for statistics
   */
  private async calculateInsights(
    startDate: Date,
    endDate: Date,
    where: any
  ): Promise<AuditLogStatistics["insights"]> {
    // Top actions
    const topActions = await db
      .select({
        action: auditLogsTable.action,
        count: count(),
      })
      .from(auditLogsTable)
      .where(where)
      .groupBy(auditLogsTable.action)
      .orderBy(desc(count()))
      .limit(5);

    // Top actors
    const topActors = await db
      .select({
        actorId: auditLogsTable.actorId,
        count: count(),
      })
      .from(auditLogsTable)
      .where(
        and(
          where,
          isNotNull(auditLogsTable.actorId)
        )
      )
      .groupBy(auditLogsTable.actorId)
      .orderBy(desc(count()))
      .limit(5);

    // Check for anomalies (unusual activity patterns)
    const anomalies = await this.detectAnomalies(startDate, endDate);

    return {
      topActions: topActions.map((item) => ({
        action: item.action as any,
        count: item.count,
      })),
      topActors: topActors.map((item) => ({
        actorId: item.actorId!,
        count: item.count,
      })),
      anomalyDetected: anomalies.length > 0,
    };
  }

  /**
   * Detect anomalies in audit logs
   */
  private async detectAnomalies(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ type: string; description: string }>> {
    const anomalies: Array<{ type: string; description: string }> = [];

    // Check for failed logins spike
    const failedLogins = await db
      .select({ count: count() })
      .from(auditLogsTable)
      .where(
        and(
          gte(auditLogsTable.createdAt, startDate),
          lte(auditLogsTable.createdAt, endDate),
          eq(auditLogsTable.action, "LOGIN_FAILED")
        )
      );

    if ((failedLogins[0]?.count || 0) > 50) {
      anomalies.push({
        type: "FAILED_LOGIN_SPIKE",
        description: `High number of failed logins: ${failedLogins[0]?.count || 0}`,
      });
    }

    // Check for rapid sequential operations
    const rapidOps = await db
      .select({ count: count() })
      .from(auditLogsTable)
      .where(
        and(
          gte(auditLogsTable.createdAt, startDate),
          lte(auditLogsTable.createdAt, endDate),
          sql`metadata->>'batch' IS NOT NULL`
        )
      );

    if ((rapidOps[0]?.count || 0) > 100) {
      anomalies.push({
        type: "BATCH_OPERATIONS",
        description: `High number of batch operations: ${rapidOps[0]?.count || 0}`,
      });
    }

    return anomalies;
  }

  /**
   * Convert audit logs to CSV
   */
  private toCSV(logs: AuditLog[]): string {
    if (logs.length === 0) return "";

    const headers = [
      "id",
      "actorType",
      "actorId",
      "actorEmail",
      "action",
      "targetType",
      "targetId",
      "targetName",
      "ipAddress",
      "createdAt",
    ];

    const rows = logs.map((log) => [
      log.id,
      log.actorType,
      log.actorId || "",
      log.actorEmail || "",
      log.action,
      log.targetType,
      log.targetId || "",
      log.targetName || "",
      log.ipAddress || "",
      log.createdAtIso,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }
}

// Export singleton instance
export const auditService = new AuditService();