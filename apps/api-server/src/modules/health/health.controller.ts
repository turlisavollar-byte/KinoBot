import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { isBotRunning } from "@/bot/index";
import { queue } from "@/infrastructure/queue/bull";
import { storage } from "@/infrastructure/storage/minio";
import { Logger } from "@/shared/utils/logger";
import { isTelegramMediaPipelineRunning } from "@/modules/telegram-media/telegram-media.pipeline";

const logger = Logger.getInstance("HealthController");
const DEPENDENCY_TIMEOUT_MS = 5_000;

interface HealthStatus {
  status: "ok" | "degraded" | "down";
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    database: "ok" | "error";
    bot: "running" | "stopped";
    cache: "ok" | "stub";
    queue: "ok" | "error" | "stub";
    storage: "ok" | "error" | "stub";
    search: "ok" | "stub";
    telegramMediaPipeline: "running" | "stopped";
  };
}

async function checkDependency<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<"ok" | "error"> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${name} health check timed out`)),
          DEPENDENCY_TIMEOUT_MS,
        );
        timeout.unref();
      }),
    ]);
    return "ok";
  } catch (error) {
    logger.error("Health dependency check failed", {
      dependency: name,
      err: error instanceof Error ? error.message : "Unknown health check error",
    });
    return "error";
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export class HealthController {
  private async getHealthStatus(): Promise<HealthStatus> {
    const database = await checkDependency("database", () => db.execute(sql`SELECT 1`));
    const hasQueue = Boolean(process.env.REDIS_URL);
    const hasStorage = Boolean(
      process.env.VIDEO_BUCKET &&
      (process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY) &&
      (process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY),
    );
    const [queueStatus, storageStatus] = await Promise.all([
      hasQueue
        ? checkDependency("queue", () => queue.getCounts("telegram-media"))
        : Promise.resolve("stub" as const),
      hasStorage
        ? checkDependency("storage", () => storage.checkBucket(process.env.VIDEO_BUCKET!))
        : Promise.resolve("stub" as const),
    ]);
    const telegramMediaPipeline = isTelegramMediaPipelineRunning()
      ? "running"
      : "stopped";
    const status =
      database === "ok" &&
      queueStatus !== "error" &&
      storageStatus !== "error" &&
      telegramMediaPipeline === "running"
        ? "ok"
        : "degraded";

    return {
      status,
      version: process.env["npm_package_version"] ?? "0.0.0",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        database,
        bot: isBotRunning() ? "running" : "stopped",
        cache: "stub",
        queue: queueStatus,
        storage: storageStatus,
        search: "stub",
        telegramMediaPipeline,
      },
    };
  }

  async check(_req: Request, res: Response): Promise<void> {
    const health = await this.getHealthStatus();
    res.status(health.status === "ok" ? 200 : 503).json(health);
  }

  async ready(_req: Request, res: Response): Promise<void> {
    const health = await this.getHealthStatus();
    if (health.status === "ok") {
      res.json({ ready: true, services: health.services });
      return;
    }
    res.status(503).json({ ready: false, services: health.services });
  }

  async live(_req: Request, res: Response): Promise<void> {
    res.json({ alive: true, uptime: process.uptime() });
  }
}

export const healthController = new HealthController();
