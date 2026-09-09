import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { isBotRunning } from "@/bot/index";

interface HealthStatus {
  status: "ok" | "degraded" | "down";
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    database: "ok" | "error";
    bot: "running" | "stopped";
    cache: "ok" | "stub";
    queue: "ok" | "stub";
    storage: "ok" | "stub";
    search: "ok" | "stub";
  };
}

export class HealthController {
  async check(_req: Request, res: Response): Promise<void> {
    const start = Date.now();

    let dbStatus: "ok" | "error" = "error";
    try {
      await db.execute(sql`SELECT 1`);
      dbStatus = "ok";
    } catch {}

    const health: HealthStatus = {
      status: dbStatus === "ok" ? "ok" : "degraded",
      version: process.env["npm_package_version"] ?? "0.0.0",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        bot: isBotRunning() ? "running" : "stopped",
        cache: "stub",
        queue: "stub",
        storage: "stub",
        search: "stub",
      },
    };

    res.status(health.status === "ok" ? 200 : 503).json(health);
  }

  async ready(_req: Request, res: Response): Promise<void> {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({ ready: true });
    } catch {
      res.status(503).json({ ready: false });
    }
  }

  async live(_req: Request, res: Response): Promise<void> {
    res.json({ alive: true, uptime: process.uptime() });
  }
}

export const healthController = new HealthController();
