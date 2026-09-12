// modules/audit/audit.routes.ts

import { Router } from "express";
import { auditController } from "./audit.controller";
import { auditLog, auditMiddleware } from "./audit.middleware";
import { requireAuth, requirePermission } from "@/shared/middleware";
import { Permission } from "@/shared/constants/permissions";
import { rateLimit } from "express-rate-limit";
import { Logger } from "@/shared/utils/logger";

const router = Router();
const logger = Logger.getInstance("AuditRoutes");

// ==================== Rate Limiting ====================

// General audit read rate limit
const readRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export rate limit (lower limit)
const exportRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Export rate limit exceeded, please try again later",
    },
  },
});

// Retention policy rate limit (admin only)
const retentionRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Retention policy rate limit exceeded",
    },
  },
});

// ==================== Middleware ====================

// All routes require authentication
router.use(requireAuth);

// Audit logging for all audit routes
router.use(
  auditMiddleware({
    action: "AUDIT_VIEW",
    targetType: "AUDIT_LOG",
    getMetadata: (req) => ({
      endpoint: req.path,
      method: req.method,
    }),
  }),
);

// ==================== Routes ====================

/**
 * GET /audit-logs
 * List audit logs with pagination and filtering
 * Permission: READ_AUDIT_LOGS
 */
router.get(
  "/",
  requirePermission(Permission.READ_AUDIT_LOGS),
  readRateLimit,
  auditController.list.bind(auditController),
);

/**
 * GET /audit-logs/search
 * Search audit logs
 * Permission: READ_AUDIT_LOGS
 */
router.get(
  "/search",
  requirePermission(Permission.READ_AUDIT_LOGS),
  readRateLimit,
  auditController.search.bind(auditController),
);

/**
 * GET /audit-logs/statistics
 * Get audit statistics
 * Permission: READ_AUDIT_LOGS
 */
router.get(
  "/statistics",
  requirePermission(Permission.READ_AUDIT_LOGS),
  readRateLimit,
  auditController.statistics.bind(auditController),
);

/**
 * GET /audit-logs/timeline/:targetType/:targetId
 * Get timeline for a specific entity
 * Permission: READ_AUDIT_LOGS
 */
router.get(
  "/timeline/:targetType/:targetId",
  requirePermission(Permission.READ_AUDIT_LOGS),
  readRateLimit,
  auditController.timeline.bind(auditController),
);

/**
 * GET /audit-logs/user/:userId/trail
 * Get user audit trail
 * Permission: READ_AUDIT_LOGS
 */
router.get(
  "/user/:userId/trail",
  requirePermission(Permission.READ_AUDIT_LOGS),
  readRateLimit,
  auditController.userTrail.bind(auditController),
);

/**
 * GET /audit-logs/export
 * Export audit logs
 * Permission: EXPORT_AUDIT_LOGS
 */
router.get(
  "/export",
  requirePermission(Permission.EXPORT_AUDIT_LOGS),
  exportRateLimit,
  auditController.export.bind(auditController),
);

/**
 * POST /audit-logs/retention
 * Apply retention policy
 * Permission: MANAGE_AUDIT_LOGS
 */
router.post(
  "/retention",
  requirePermission(Permission.MANAGE_AUDIT_LOGS),
  retentionRateLimit,
  auditController.applyRetention.bind(auditController),
);

/**
 * GET /audit-logs/:id
 * Get single audit log by ID
 * Permission: READ_AUDIT_LOGS
 */
router.get(
  "/:id",
  requirePermission(Permission.READ_AUDIT_LOGS),
  readRateLimit,
  auditController.get.bind(auditController),
);

// ==================== Export ====================

export default router;
