// modules/audit/audit.controller.ts

import type { Request, Response, NextFunction } from "express";
import { auditService, AuditError, AuditValidationError, AuditNotFoundError } from "./audit.service";
import { Logger } from "@/shared/utils/logger";
import type { 
  AuditLogQueryOptions,
  AuditLogExportOptions,
  AuditSeverity,
} from "./audit.types";

export class AuditController {
  private readonly logger = Logger.getInstance("AuditController");

  /**
   * GET /audit-logs
   * List audit logs with pagination and filtering
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Parse and validate query parameters
      const options = this.parseListQuery(req.query);
      
      this.logger.debug("Listing audit logs", { 
        options,
        userId: (req as any).user?.id,
      });

      const result = await auditService.list(options);
      
      const duration = Date.now() - startTime;
      this.logger.info("Audit logs listed", {
        count: result.data.length,
        hasMore: result.meta.hasMore,
        duration: `${duration}ms`,
      });

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error("Failed to list audit logs", { error });
      next(error);
    }
  }

  /**
   * GET /audit-logs/:id
   * Get single audit log by ID
   */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      
      if (!id) {
        throw new AuditValidationError("Audit log ID is required");
      }

      this.logger.debug("Getting audit log", { id });

      const log = await auditService.getByIdOrThrow(id);
      
      const duration = Date.now() - startTime;
      this.logger.info("Audit log retrieved", { id, duration: `${duration}ms` });

      res.json({
        success: true,
        data: log,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error("Failed to get audit log", { 
        id: req.params.id,
        error 
      });
      next(error);
    }
  }

  /**
   * GET /audit-logs/search
   * Search audit logs
   */
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim().length < 2) {
        throw new AuditValidationError("Search query must be at least 2 characters");
      }

      const options = this.parseListQuery(req.query);
      
      this.logger.debug("Searching audit logs", { query, options });

      const result = await auditService.search(query, options);
      
      const duration = Date.now() - startTime;
      this.logger.info("Audit logs searched", {
        query,
        count: result.data.length,
        duration: `${duration}ms`,
      });

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
        query,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error("Failed to search audit logs", { 
        query: req.query.q,
        error 
      });
      next(error);
    }
  }

  /**
   * GET /audit-logs/statistics
   * Get audit statistics
   */
  async statistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
      
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new AuditValidationError("Invalid date format");
      }

      if (startDate > endDate) {
        throw new AuditValidationError("startDate must be before endDate");
      }

      // Limit date range to prevent performance issues
      const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days
      if (endDate.getTime() - startDate.getTime() > maxRange) {
        throw new AuditValidationError("Date range cannot exceed 90 days");
      }

      const includeInsights = req.query.insights === "true";
      
      this.logger.debug("Getting audit statistics", { 
        startDate, 
        endDate, 
        includeInsights 
      });

      const stats = await auditService.getStatistics(startDate, endDate, {
        includeInsights,
      });

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error("Failed to get audit statistics", { error });
      next(error);
    }
  }

  /**
   * GET /audit-logs/timeline/:targetType/:targetId
   * Get timeline for a specific entity
   */
  async timeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetType = Array.isArray(req.params.targetType) ? req.params.targetType[0] : req.params.targetType;
      const targetId = Array.isArray(req.params.targetId) ? req.params.targetId[0] : req.params.targetId;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!targetType || !targetId) {
        throw new AuditValidationError("targetType and targetId are required");
      }

      this.logger.debug("Getting timeline", { targetType, targetId, limit });

      const timeline = await auditService.getTimeline(targetType, targetId, limit);

      res.json({
        success: true,
        data: timeline,
        meta: {
          targetType,
          targetId,
          count: timeline.length,
          limit,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error("Failed to get timeline", { 
        targetType: req.params.targetType,
        targetId: req.params.targetId,
        error 
      });
      next(error);
    }
  }

  /**
   * GET /audit-logs/user/:userId/trail
   * Get user audit trail
   */
  async userTrail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const limit = parseInt(req.query.limit as string) || 100;

      if (!userId) {
        throw new AuditValidationError("userId is required");
      }

      this.logger.debug("Getting user trail", { userId, limit });

      const trail = await auditService.getUserTrail(userId, limit);

      res.json({
        success: true,
        data: trail,
        meta: {
          userId,
          count: trail.length,
          limit,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error("Failed to get user trail", { 
        userId: req.params.userId,
        error 
      });
      next(error);
    }
  }

  /**
   * GET /audit-logs/export
   * Export audit logs
   */
  async export(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const format = (req.query.format as string) || "json";

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new AuditValidationError("Invalid date format");
      }

      if (startDate > endDate) {
        throw new AuditValidationError("startDate must be before endDate");
      }

      // Limit export range
      const maxRange = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (endDate.getTime() - startDate.getTime() > maxRange) {
        throw new AuditValidationError("Export range cannot exceed 30 days");
      }

      const exportOptions: AuditLogExportOptions = {
        format: format as any,
        startDate,
        endDate,
        filters: {
          actorId: req.query.actorId as string,
          action: req.query.action as any,
          targetType: req.query.targetType as any,
        },
      };

      this.logger.info("Exporting audit logs", { 
        format,
        startDate,
        endDate,
        userId: (req as any).user?.id,
      });

      const exportResult = await auditService.export(exportOptions);

      // Set headers for file download
      res.setHeader("Content-Type", exportResult.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${exportResult.filename}"`);
      res.setHeader("Cache-Control", "no-cache");

      res.send(exportResult.data);

    } catch (error) {
      this.logger.error("Failed to export audit logs", { error });
      next(error);
    }
  }

  /**
   * POST /audit-logs/retention
   * Apply retention policy (Admin only)
   */
  async applyRetention(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { retentionDays, archiveAfterDays, deleteAfterDays } = req.body;

      if (!retentionDays || !archiveAfterDays || !deleteAfterDays) {
        throw new AuditValidationError("retentionDays, archiveAfterDays, and deleteAfterDays are required");
      }

      const policy = {
        retentionDays,
        archiveAfterDays,
        deleteAfterDays,
        granularity: "daily" as const,
      };

      this.logger.warn("Applying retention policy", { 
        policy,
        userId: (req as any).user?.id,
        adminEmail: (req as any).user?.email,
      });

      const result = await auditService.applyRetentionPolicy(policy);

      res.json({
        success: true,
        data: {
          archived: result.archived,
          deleted: result.deleted,
          policy,
          timestamp: new Date().toISOString(),
        },
        message: `Archived ${result.archived} and deleted ${result.deleted} logs`,
      });

    } catch (error) {
      this.logger.error("Failed to apply retention policy", { error });
      next(error);
    }
  }

  // ==================== Private Methods ====================

  /**
   * Parse and validate list query parameters
   */
  private parseListQuery(query: any): AuditLogQueryOptions {
    const options: AuditLogQueryOptions = {
      actorId: query.actorId as string,
      actorType: query.actorType as any,
      action: query.action as any,
      targetType: query.targetType as any,
      targetId: query.targetId as string,
      limit: this.parseLimit(query.limit),
      cursor: query.cursor as string,
      includeArchived: query.includeArchived === "true",
    };

    // Parse dates
    if (query.startDate) {
      const date = new Date(query.startDate as string);
      if (!isNaN(date.getTime())) {
        options.startDate = date;
      }
    }

    if (query.endDate) {
      const date = new Date(query.endDate as string);
      if (!isNaN(date.getTime())) {
        options.endDate = date;
      }
    }

    // Parse severity
    if (query.severity) {
      options.severity = query.severity as AuditSeverity;
    }

    // Parse tags
    if (query.tags) {
      options.tags = Array.isArray(query.tags) 
        ? query.tags as string[]
        : [query.tags as string];
    }

    return options;
  }

  /**
   * Parse and validate limit
   */
  private parseLimit(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return 50;
    return Math.min(Math.floor(parsed), 100);
  }
}

export const auditController = new AuditController();