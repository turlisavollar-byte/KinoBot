// modules/analytics/interface/http/controllers/analytics.controller.ts

import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import { AnalyticsService } from "../../../application/services/analytics.service";
import { DateRange } from "../../../domain/value-objects/date-range.vo";
import { Logger } from "@/shared/utils/logger";
import { AppError } from "@/shared/errors/AppError";
import { z } from "zod";

// Validation schemas
const DateRangeSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    period: z.enum(["7d", "30d", "90d", "1y"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { message: "Start date must be before end date" },
  );

const TopContentSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(["movie", "series", "episode"]).optional(),
});

const RevenueTrendSchema = z.object({
  groupBy: z.enum(["day", "week", "month"]).default("day"),
  includeRefunds: z.coerce.boolean().default(false),
});

@injectable()
export class AnalyticsController {
  private readonly logger = Logger.getInstance("AnalyticsController");

  constructor(
    @inject("AnalyticsService")
    private readonly analyticsService: AnalyticsService,
  ) {}

  // GET /analytics/overview
  async getOverview(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validated = DateRangeSchema.parse(req.query);

      let dateRange: DateRange;
      if (validated.period) {
        dateRange = DateRange.fromPeriod(validated.period);
      } else if (validated.startDate && validated.endDate) {
        dateRange = DateRange.create(
          new Date(validated.startDate),
          new Date(validated.endDate),
        );
      } else {
        dateRange = DateRange.fromDays(30);
      }

      const stats = await this.analyticsService.getOverviewStats(dateRange);

      res.json({
        success: true,
        data: stats.toJSON(),
        meta: {
          period: dateRange.toJSON(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /analytics/revenue-trend
  async getRevenueTrend(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dateRange = this.parseDateRange(req.query);
      const validated = RevenueTrendSchema.parse(req.query);

      const trend = await this.analyticsService.getRevenueTrend(dateRange, {
        groupBy: validated.groupBy,
        includeRefunds: validated.includeRefunds,
      });

      res.json({
        success: true,
        data: trend.toJSON(),
        meta: {
          period: dateRange.toJSON(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /analytics/top-content
  async getTopContent(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dateRange = this.parseDateRange(req.query);
      const validated = TopContentSchema.parse(req.query);

      const content = await this.analyticsService.getTopContent(
        dateRange,
        validated.limit,
        validated.offset,
      );

      let items = content.items;
      if (validated.type) {
        items = content.filterByType(validated.type);
      }

      res.json({
        success: true,
        data: {
          items,
          totalViews: content.toJSON().totalViews,
          averageViews: content.toJSON().averageViews,
          period: content.toJSON().period,
          limit: validated.limit,
          offset: validated.offset,
        },
        meta: {
          total: items.length,
          hasMore: content.hasMore,
          period: dateRange.toJSON(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /analytics/subscription-trend
  async getSubscriptionTrend(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dateRange = this.parseDateRange(req.query);

      const trend = await this.analyticsService.getSubscriptionTrend(dateRange);

      res.json({
        success: true,
        data: trend.toJSON(),
        meta: {
          period: dateRange.toJSON(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /analytics/invalidate-cache
  async invalidateCache(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await this.analyticsService.invalidateCache();

      res.json({
        success: true,
        message: "Analytics cache invalidated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Private helpers
  private parseDateRange(query: any): DateRange {
    const validated = DateRangeSchema.parse(query);

    if (validated.period) {
      return DateRange.fromPeriod(validated.period);
    }

    if (validated.startDate && validated.endDate) {
      return DateRange.create(
        new Date(validated.startDate),
        new Date(validated.endDate),
      );
    }

    return DateRange.fromDays(30);
  }
}
