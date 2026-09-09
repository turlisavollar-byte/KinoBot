// modules/analytics/interface/http/routes/analytics.routes.ts

import { Router } from "express";
import { container } from "tsyringe";
import { AnalyticsController } from "../controllers/analytics.controller";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";
import { analyticsRateLimit } from "../middleware/analytics-rate-limit.middleware";
import { analyticsCacheMiddleware } from "../middleware/analytics-cache.middleware";
import {
  DateRangeSchema,
  TopContentSchema,
  RevenueTrendSchema,
} from "../validators/analytics.validator";

const router = Router();

function getController(): AnalyticsController {
  return container.resolve(AnalyticsController);
}

// All routes require authentication
router.use(requireAuth);

// Analytics endpoints
router.get(
  "/overview",
  requirePermission(Permission.VIEW_ANALYTICS),
  analyticsRateLimit,
  analyticsCacheMiddleware("overview", 300),
  (req, res, next) => getController().getOverview(req, res, next),
);

router.get(
  "/revenue-trend",
  requirePermission(Permission.VIEW_ANALYTICS),
  analyticsRateLimit,
  analyticsCacheMiddleware("revenue", 600),
  (req, res, next) => getController().getRevenueTrend(req, res, next),
);

router.get(
  "/top-content",
  requirePermission(Permission.VIEW_ANALYTICS),
  analyticsRateLimit,
  analyticsCacheMiddleware("top-content", 600),
  (req, res, next) => getController().getTopContent(req, res, next),
);

router.get(
  "/subscription-trend",
  requirePermission(Permission.VIEW_ANALYTICS),
  analyticsRateLimit,
  analyticsCacheMiddleware("subscription", 600),
  (req, res, next) => getController().getSubscriptionTrend(req, res, next),
);

// Admin only - cache invalidation
router.post(
  "/invalidate-cache",
  requirePermission(Permission.MANAGE_SYSTEM),
  (req, res, next) => getController().invalidateCache(req, res, next),
);

export default router;
