// modules/audit/audit.types.ts

export type AuditAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "UPSERT"
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "REGISTER"
  | "VERIFY_EMAIL"
  | "RESET_PASSWORD"
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_CANCELLED"
  | "SUBSCRIPTION_UPDATED"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "BOT_COMMAND"
  | "CONFIG_CHANGED"
  | "ROLE_CHANGED"
  | "PERMISSION_CHANGED"
  | "EXPORT_DATA"
  | "IMPORT_DATA"
  | "SYSTEM_START"
  | "SYSTEM_STOP"
  | "ERROR"
  | "WARNING"
  | "AUDIT_VIEW"
  | "AUDIT_EXPORT"
  | "SECURITY_ALERT"
  | "COMPLIANCE_CHECK";

export type AuditActorType =
  | "USER"
  | "ADMIN"
  | "SYSTEM"
  | "BOT"
  | "API"
  | "WEBHOOK"
  | "CRON_JOB"
  | "UNKNOWN";

export type AuditTargetType =
  | "USER"
  | "ADMIN"
  | "SUBSCRIPTION"
  | "PAYMENT"
  | "CONFIG"
  | "BOT"
  | "AUDIT_LOG"
  | "ROLE"
  | "PERMISSION"
  | "ORGANIZATION"
  | "TEAM"
  | "PROJECT"
  | "DATABASE"
  | "FILE"
  | "UNKNOWN";

export type AuditSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AuditLog {
  id: string;
  
  // Actor
  actorId?: string;
  actorType: AuditActorType;
  actorEmail?: string;
  
  // Action
  action: AuditAction;
  
  // Target
  targetType: AuditTargetType;
  targetId?: string;
  targetName?: string;
  
  // Changes
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  diff?: Record<string, { old: unknown; new: unknown }>;
  
  // Context
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  
  // Timestamps
  createdAt: Date;
  createdAtIso: string;
  
  // Optional
  severity?: AuditSeverity;
  tags?: string[];
}

export interface CreateAuditLogDTO {
  actorId?: string;
  actorType: AuditActorType;
  actorEmail?: string;
  
  action: AuditAction;
  
  targetType: AuditTargetType;
  targetId?: string;
  targetName?: string;
  
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  diff?: Record<string, { old: unknown; new: unknown }>;
  
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  
  severity?: AuditSeverity;
  tags?: string[];
}

export interface AuditLogQueryOptions {
  actorId?: string;
  actorType?: AuditActorType;
  action?: AuditAction;
  actionCategory?: string;
  targetType?: AuditTargetType;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  cursor?: string;
  search?: string;
  tags?: string[];
  severity?: AuditSeverity;
  includeArchived?: boolean;
  includeTotal?: boolean;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  meta: {
    limit: number;
    nextCursor?: string;
    hasMore: boolean;
    total?: number;
    filteredCount?: number;
  };
}

export interface AuditLogStatistics {
  total: number;
  byAction: Record<AuditAction, number>;
  byActorType: Record<AuditActorType, number>;
  byTargetType: Record<AuditTargetType, number>;
  bySeverity?: Record<AuditSeverity, number>;
  period: {
    start: Date;
    end: Date;
  };
  insights?: {
    topActions: Array<{ action: AuditAction; count: number }>;
    topActors: Array<{ actorId: string; count: number }>;
    anomalyDetected?: boolean;
  };
}

export interface AuditLogExportOptions {
  format: "csv" | "json" | "excel";
  startDate: Date;
  endDate: Date;
  filters?: Partial<AuditLogQueryOptions>;
  includeHeaders?: boolean;
  compression?: boolean;
}

export interface AuditLogRetentionPolicy {
  retentionDays: number;
  archiveAfterDays: number;
  deleteAfterDays: number;
  granularity: "daily" | "monthly" | "yearly";
  archiveStorage?: "s3" | "glacier" | "local";
}