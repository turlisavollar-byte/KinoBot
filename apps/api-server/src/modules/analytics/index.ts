// modules/analytics/index.ts
// Clean DDD Architecture - Analytics Module

import { container } from "tsyringe";
import Redis from "ioredis";
import { AnalyticsService } from "./application/services/analytics.service";
import { AnalyticsCacheService } from "./application/services/analytics-cache.service";
import { DrizzleAnalyticsRepository } from "./application/repositories/drizzle-analytics.repository";
import { AnalyticsScheduler } from "./infrastructure/scheduler/analytics-scheduler";
import { IAnalyticsRepository } from "./domain/repositories/analytics.repository.interface";
import analyticsRouter from "./interface/http/routes/analytics.routes";
import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("AnalyticsModule");

// ── Dependency Injection (DI Container) ─────────────────────────────
function registerDependencies() {
  const redisClient = new Redis(
    process.env.REDIS_URL || "redis://localhost:6379",
  );

  container.registerInstance("RedisClient", redisClient);

  // Register repositories
  container.registerSingleton<IAnalyticsRepository>(
    "IAnalyticsRepository",
    DrizzleAnalyticsRepository,
  );

  // Register services
  container.registerSingleton<AnalyticsCacheService>(
    "AnalyticsCacheService",
    AnalyticsCacheService,
  );

  container.registerSingleton<AnalyticsService>(
    "AnalyticsService",
    AnalyticsService,
  );

  // Register infrastructure
  container.registerSingleton<AnalyticsScheduler>(
    "AnalyticsScheduler",
    AnalyticsScheduler,
  );

  logger.info("Analytics module dependencies registered");
}

// ── Routes ───────────────────────────────────────────────────────────
export { analyticsRouter };

initializeAnalyticsModule();

// ── Module Initialization (called from server startup) ─────────────
export function initializeAnalyticsModule(): void {
  try {
    registerDependencies();
    logger.info("Analytics module initialized");
  } catch (error) {
    logger.error("Failed to initialize analytics module", { error });
  }
}

// ── Scheduler Start (called from server startup) ─────────────────────
export function startAnalyticsScheduler(): void {
  try {
    const analyticsScheduler = container.resolve(AnalyticsScheduler);
    analyticsScheduler.start();
    logger.info("Analytics scheduler started");
  } catch (error) {
    logger.error("Failed to start analytics scheduler", { error });
  }
}

// ── Exports for cross-module use ─────────────────────────────────────
export function getAnalyticsService(): AnalyticsService {
  return container.resolve(AnalyticsService);
}

export function getAnalyticsCacheService(): AnalyticsCacheService {
  return container.resolve(AnalyticsCacheService);
}
