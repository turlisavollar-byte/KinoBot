import "reflect-metadata";
import "dotenv/config";
import type { Server } from "node:http";
import app from "@/app";
import { startBot, stopBot } from "@/bot/index";
import { bootstrapSuperAdmin } from "@/modules/identity";
import { closeAuditArchiverPool } from "@/modules/audit/audit.service";
import { pool } from "@workspace/db";

// Increase EventEmitter max listeners to prevent memory leak warnings
process.setMaxListeners(20);

console.log("Starting server initialization...");
const rawPort = process.env["PORT"] ?? process.env["API_PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  console.error(`Invalid PORT value: "${rawPort}"`);
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

console.log(`Starting server on port ${port}...`);

let httpServer: Server | undefined;
let botStartPromise: Promise<void> | undefined;
let shutdownPromise: Promise<void> | undefined;

function closeHttpServer(): Promise<void> {
  if (!httpServer?.listening) return Promise.resolve();

  return new Promise((resolve, reject) => {
    httpServer!.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function shutdown(signal: string, requestedExitCode = 0): Promise<void> {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    console.log(`Shutting down on ${signal}`);
    let exitCode = requestedExitCode;

    try {
      await closeHttpServer();
    } catch (error) {
      exitCode = 1;
      console.error("HTTP server shutdown failed:", error);
    }

    try {
      await botStartPromise;
    } catch (error) {
      exitCode = 1;
      console.error("Telegram bot startup did not finish cleanly:", error);
    }

    try {
      await stopBot();
    } catch (error) {
      exitCode = 1;
      console.error("Telegram bot shutdown failed:", error);
    }

    try {
      await closeAuditArchiverPool();
    } catch (error) {
      exitCode = 1;
      console.error("Audit archiver pool shutdown failed:", error);
    }

    try {
      await pool.end();
    } catch (error) {
      exitCode = 1;
      console.error("Primary database pool shutdown failed:", error);
    }

    process.exit(exitCode);
  })();

  return shutdownPromise;
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

async function startServer() {
  await bootstrapSuperAdmin();
  httpServer = app.listen(port, "0.0.0.0", () => {
    console.log(`Server successfully started on port ${port}`);

    // Start Telegram bot in background (non-blocking)
    botStartPromise = startBot();
    botStartPromise.catch((e) => {
      console.warn("Bot startup failed - server will continue running:", e);
    });
  });
}

startServer().catch((error) => {
  console.error("Error starting server:", error);
  void shutdown("startup failure", 1);
});
