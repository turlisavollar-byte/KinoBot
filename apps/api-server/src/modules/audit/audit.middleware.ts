// modules/audit/audit.middleware.ts

import type { Request, Response, NextFunction } from "express";
import { normalizeRoleName } from "@/shared/constants/roles";
import { auditService } from "./audit.service";
import { Logger } from "@/shared/utils/logger";
import type {
  AuditAction,
  AuditTargetType,
  AuditActorType,
} from "./audit.types";

export interface AuditMiddlewareOptions {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | ((req: Request) => string | undefined);
  targetName?: string | ((req: Request) => string | undefined);
  getOldValue?: (req: Request) => Promise<Record<string, unknown> | undefined>;
  getNewValue?: (req: Request) => Promise<Record<string, unknown> | undefined>;
  getMetadata?: (req: Request, res: Response) => Record<string, unknown>;
  skipLogging?: (req: Request, res: Response) => boolean;
  onError?: (error: Error, req: Request, res: Response) => void;
}

export interface AuditLogResult {
  logId?: string;
  success: boolean;
  duration: number;
  error?: Error;
}

/**
 * Audit logging middleware
 * Automatically logs requests and responses
 */
export function auditMiddleware(options: AuditMiddlewareOptions) {
  const logger = Logger.getInstance("AuditMiddleware");

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    let oldValue: Record<string, unknown> | undefined;
    let error: Error | undefined;
    let logId: string | undefined;
    let success = false;
    let responseData: any;
    let auditLogged = false;

    // Check if we should skip logging
    if (options.skipLogging && options.skipLogging(req, res)) {
      return next();
    }

    // Capture response data
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    res.send = function (data: any) {
      responseData = data;
      return originalSend(data);
    };

    res.json = function (data: any) {
      responseData = data;
      return originalJson(data);
    };

    const logAudit = async () => {
      if (auditLogged) return;
      auditLogged = true;

      const duration = Date.now() - startTime;
      let newValue: Record<string, unknown> | undefined;

      if (options.getNewValue) {
        try {
          newValue = await options.getNewValue(req);
        } catch (err) {
          logger.warn("Failed to get new value for audit", {
            error: err,
            action: options.action,
          });
        }
      }

      const user = (req as any).user;
      const actorType = determineActorType(user);
      const metadata = {
        ...(options.getMetadata ? options.getMetadata(req, res) : {}),
        duration,
        statusCode: res.statusCode,
        responseSize: responseData ? JSON.stringify(responseData).length : 0,
        endpoint: req.path,
        method: req.method,
      };

      try {
        const auditLog = await auditService.log({
          actorId: user?.id,
          actorType,
          actorEmail: user?.email,
          action: options.action,
          targetType: options.targetType,
          targetId:
            typeof options.targetId === "function"
              ? options.targetId(req)
              : options.targetId,
          targetName:
            typeof options.targetName === "function"
              ? options.targetName(req)
              : options.targetName,
          oldValue,
          newValue,
          metadata,
          ipAddress: req.ip || (req.headers["x-forwarded-for"] as string),
          userAgent: req.headers["user-agent"],
          requestId: req.headers["x-request-id"] as string,
          sessionId: (req as any).session?.id,
          severity: error ? "HIGH" : "LOW",
        });

        logId = auditLog.id;
        success = true;

        logger.debug("Audit log created", {
          logId,
          action: options.action,
          duration,
        });
      } catch (err) {
        error = err as Error;
        success = false;

        logger.error("Failed to create audit log", {
          error,
          action: options.action,
          path: req.path,
        });
      } finally {
        const auditResult: AuditLogResult = {
          logId,
          success,
          duration: Date.now() - startTime,
          error,
        };
        (res as any).audit = auditResult;
      }
    };

    const onFinish = () => {
      void logAudit();
    };

    res.once("finish", onFinish);
    res.once("close", onFinish);

    const targetId =
      typeof options.targetId === "function"
        ? options.targetId(req)
        : options.targetId;

    const targetName =
      typeof options.targetName === "function"
        ? options.targetName(req)
        : options.targetName;

    Promise.resolve()
      .then(async () => {
        if (options.getOldValue) {
          try {
            oldValue = await options.getOldValue(req);
          } catch (err) {
            logger.warn("Failed to get old value for audit", {
              error: err,
              action: options.action,
            });
          }
        }
      })
      .then(() => next())
      .catch((err) => {
        error = err as Error;
        next(error);
      });
  };
}

/**
 * Audit log middleware with automatic context extraction
 * Simplified version for common use cases
 */
export function auditLog(options: {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | ((req: Request) => string | undefined);
  targetName?: string | ((req: Request) => string | undefined);
  metadata?: (req: Request, res: Response) => Record<string, unknown>;
}) {
  return auditMiddleware({
    action: options.action,
    targetType: options.targetType,
    targetId: options.targetId,
    targetName: options.targetName,
    getMetadata: options.metadata,
  });
}

/**
 * Audit middleware factory for CRUD operations
 */
export function auditCrud(options: {
  action: AuditAction;
  targetType: AuditTargetType;
  getTargetId: (req: Request) => string;
  getTargetName?: (req: Request) => string;
  getOldValue: (req: Request) => Promise<Record<string, unknown> | undefined>;
  getNewValue: (req: Request) => Promise<Record<string, unknown> | undefined>;
}) {
  return auditMiddleware({
    action: options.action,
    targetType: options.targetType,
    targetId: (req) => options.getTargetId(req),
    targetName: options.getTargetName,
    getOldValue: options.getOldValue,
    getNewValue: options.getNewValue,
    getMetadata: (req) => ({
      crudOperation: options.action,
      targetId: options.getTargetId(req),
    }),
  });
}

// Helper function to determine actor type
function determineActorType(user?: any): AuditActorType {
  if (!user) return "SYSTEM";

  const normalizedRole = String(
    normalizeRoleName(String(user.role ?? "")) ?? "",
  );

  if (normalizedRole === "admin" || normalizedRole === "superadmin") {
    return "ADMIN";
  }
  if (normalizedRole === "system") return "SYSTEM";
  if (normalizedRole === "bot") return "BOT";
  if (normalizedRole === "api") return "API";
  if (normalizedRole === "webhook") return "WEBHOOK";
  if (normalizedRole === "cron_job") return "CRON_JOB";

  return "USER";
}
