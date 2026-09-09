// modules/audit/audit.error.ts
import type { Request, Response, NextFunction } from "express";
import { AuditError, AuditValidationError, AuditNotFoundError } from "./audit.service";
import { Logger } from "@/shared/utils/logger";

/**
 * Express error handler for audit errors
 */
export function auditErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const logger = Logger.getInstance("AuditErrorHandler");
  
  logger.error("Audit error occurred", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
  });

  // Handle specific audit errors
  if (error instanceof AuditValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (error instanceof AuditNotFoundError) {
    res.status(404).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (error instanceof AuditError) {
    res.status(500).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Pass to default error handler
  next(error);
}