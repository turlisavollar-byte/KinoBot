// shared/utils/audit.ts

import type { Request } from "express";
import { normalizeRoleName } from "@/shared/constants/roles";
import { auditService } from "@/modules/audit/audit.service";
import type {
  AuditAction,
  AuditTargetType,
  AuditActorType,
  CreateAuditLogDTO,
} from "@/modules/audit/audit.types";

// Audit context from request
export interface AuditContext {
  actorId?: string;
  actorType?: AuditActorType;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
}

// Extended parameters with automatic context extraction
export interface AuditEventParams {
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  targetName?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  // Direct actor info (overrides req extraction)
  actorId?: string;
  actorType?: AuditActorType;
  actorEmail?: string;

  // Legacy support
  userId?: string;

  // Request for automatic context extraction
  req?: Request;

  // Additional context
  correlationId?: string;
  environment?: string;
  serviceName?: string;
  tags?: Record<string, string>;

  // Compliance
  compliance?: {
    gdpr?: boolean;
    pci?: boolean;
    hipaa?: boolean;
  };
}

// Result with audit log ID
export interface AuditEventResult {
  logId: string;
  success: boolean;
  timestamp: Date;
}

/**
 * Log an audit event with automatic context extraction
 * Main function for enterprise audit logging
 */
export async function logAuditEvent(
  params: AuditEventParams,
): Promise<AuditEventResult> {
  try {
    // Extract context from request if provided
    const context = extractAuditContext(params.req);

    // Determine actor
    const actorId = params.actorId ?? params.userId ?? context.actorId;
    const actorType = params.actorType ?? context.actorType ?? "SYSTEM";
    const actorEmail = params.actorEmail ?? context.actorEmail;

    // Prepare DTO
    const dto: CreateAuditLogDTO = {
      actorId,
      actorType,
      actorEmail,
      action: params.action,
      targetType: params.targetType ?? "UNKNOWN",
      targetId: params.targetId,
      targetName: params.targetName,
      oldValue: params.oldValue,
      newValue: params.newValue,
      metadata: {
        ...params.metadata,
        ...(params.tags && { tags: params.tags }),
        ...(params.correlationId && { correlationId: params.correlationId }),
        ...(params.environment && { environment: params.environment }),
        ...(params.serviceName && { serviceName: params.serviceName }),
        ...(params.compliance && { compliance: params.compliance }),
        ...(context.additionalContext && {
          requestContext: context.additionalContext,
        }),
      },
      ipAddress: params.req?.ip || context.ipAddress,
      userAgent: params.req?.headers?.["user-agent"] || context.userAgent,
      requestId: context.requestId,
      sessionId: context.sessionId,
    };

    // Log to service
    const auditLog = await auditService.log(dto);

    return {
      logId: auditLog.id,
      success: true,
      timestamp: auditLog.createdAt,
    };
  } catch (error) {
    console.error("Failed to log audit event:", error);

    // Return failure but don't throw - audit should not break business logic
    return {
      logId: "",
      success: false,
      timestamp: new Date(),
    };
  }
}

/**
 * Extract audit context from Express request
 */
export function extractAuditContext(req?: Request): {
  actorId?: string;
  actorType?: AuditActorType;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  additionalContext?: Record<string, unknown>;
} {
  if (!req) return {};

  // Extract user info from request (depends on your auth middleware)
  const user = (req as any).user;

  // Determine actor type from normalized user role
  let actorType: AuditActorType = "USER";
  const normalizedRole = String(
    normalizeRoleName(String(user?.role ?? "")) ?? "",
  );

  if (normalizedRole === "admin" || normalizedRole === "superadmin") {
    actorType = "ADMIN";
  } else if (normalizedRole === "system") {
    actorType = "SYSTEM";
  } else if (normalizedRole === "bot") {
    actorType = "BOT";
  } else if (normalizedRole === "api") {
    actorType = "API";
  } else if (normalizedRole === "webhook") {
    actorType = "WEBHOOK";
  } else if (normalizedRole === "cron_job") {
    actorType = "CRON_JOB";
  }

  return {
    actorId: user?.id,
    actorType,
    actorEmail: user?.email,
    ipAddress: req.ip || ((req.headers?.["x-forwarded-for"] as string) ?? ""),
    userAgent: req.headers?.["user-agent"] as string | undefined,
    requestId: req.headers?.["x-request-id"] as string | undefined,
    sessionId: (req as any).session?.id,
    additionalContext: {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: {
        host: req.headers?.host,
        origin: req.headers?.origin,
        referer: req.headers?.referer,
      },
    },
  };
}

/**
 * Log audit event with automatic actor resolution from request
 * Convenience function for controllers
 */
export async function logWithRequest(
  req: Request,
  params: Omit<
    AuditEventParams,
    "req" | "actorId" | "actorType" | "actorEmail" | "ipAddress" | "userAgent"
  >,
): Promise<AuditEventResult> {
  return logAuditEvent({
    ...params,
    req,
  });
}

/**
 * Log audit event with builder pattern
 * Fluent API for complex audit events
 */
export class AuditEventBuilder {
  private params: Partial<AuditEventParams> = {};

  constructor(action: AuditAction) {
    this.params.action = action;
  }

  action(action: AuditAction): this {
    this.params.action = action;
    return this;
  }

  target(
    targetType: AuditTargetType,
    targetId?: string,
    targetName?: string,
  ): this {
    this.params.targetType = targetType;
    this.params.targetId = targetId;
    this.params.targetName = targetName;
    return this;
  }

  changes(
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
  ): this {
    this.params.oldValue = oldValue;
    this.params.newValue = newValue;
    return this;
  }

  actor(actorId: string, actorType: AuditActorType, actorEmail?: string): this {
    this.params.actorId = actorId;
    this.params.actorType = actorType;
    this.params.actorEmail = actorEmail;
    return this;
  }

  context(metadata: Record<string, unknown>): this {
    this.params.metadata = { ...this.params.metadata, ...metadata };
    return this;
  }

  withRequest(req: Request): this {
    this.params.req = req;
    return this;
  }

  tag(key: string, value: string): this {
    if (!this.params.tags) this.params.tags = {};
    this.params.tags[key] = value;
    return this;
  }

  correlation(correlationId: string): this {
    this.params.correlationId = correlationId;
    return this;
  }

  async log(): Promise<AuditEventResult> {
    return logAuditEvent(this.params as AuditEventParams);
  }
}

/**
 * Create a new audit event builder
 */
export function audit(action: AuditAction): AuditEventBuilder {
  return new AuditEventBuilder(action);
}

/**
 * Log critical security events (always logs, even on failure)
 */
export async function logSecurityEvent(
  params: AuditEventParams,
): Promise<AuditEventResult> {
  // Add security tags
  const securityParams = {
    ...params,
    tags: {
      ...params.tags,
      security: "true",
      critical: "true",
    },
    metadata: {
      ...params.metadata,
      securityEvent: true,
      severity: "CRITICAL",
    },
  };

  return logAuditEvent(securityParams);
}

/**
 * Log compliance events (GDPR, PCI, HIPAA)
 */
export async function logComplianceEvent(
  params: AuditEventParams,
  complianceType: "gdpr" | "pci" | "hipaa",
): Promise<AuditEventResult> {
  const complianceParams = {
    ...params,
    compliance: {
      ...params.compliance,
      [complianceType]: true,
    },
    tags: {
      ...params.tags,
      compliance: complianceType,
    },
  };

  return logAuditEvent(complianceParams);
}

// Legacy support - keep for backward compatibility
export const logAudit = logAuditEvent;

// Default export for convenience
export default {
  logAuditEvent,
  logWithRequest,
  logSecurityEvent,
  logComplianceEvent,
  audit,
  AuditEventBuilder,
  extractAuditContext,
};
