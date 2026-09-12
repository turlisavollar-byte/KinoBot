import "reflect-metadata";
import "dotenv/config";
import app from "@/app";
import { startBot } from "@/bot/index";
import { bootstrapSuperAdmin } from "@/modules/identity";

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

async function startServer() {
  await bootstrapSuperAdmin();
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server successfully started on port ${port}`);

    // Start Telegram bot in background (non-blocking)
    startBot().catch((e) => {
      console.warn("Bot startup failed - server will continue running:", e);
    });
  });
}

startServer().catch((error) => {
  console.error("Error starting server:", error);
  process.exit(1);
});
