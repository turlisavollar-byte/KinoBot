import { Bot, session, type Context, type SessionFlavor } from "grammy";
import { eq } from "drizzle-orm";
import { db, telegramConfigTable } from "@workspace/db";
import { logger } from "@/lib/logger";
import { registerStartHandler } from "@/bot/handlers/start";
import { registerCatalogHandler } from "@/bot/handlers/catalog";
import { registerSubscriptionHandler } from "@/bot/handlers/subscription";
import { registerStorageHandler } from "@/bot/handlers/storage";

export interface SessionData {
  step?: string;
  language?: "uz" | "ru";
  page?: number;
  searchQuery?: string;
}

export type BotContext = Context & SessionFlavor<SessionData>;

let _bot: Bot<BotContext> | null = null;
let _isRunning = false;

export function getBot(): Bot<BotContext> | null {
  return _bot;
}

export async function startBot(): Promise<void> {
  if (_isRunning) {
    await stopBot();
  }

  const [config] = await db
    .select()
    .from(telegramConfigTable)
    .where(eq(telegramConfigTable.isActive, true))
    .limit(1);

  if (!config?.botToken) {
    logger.info("Telegram bot: no active config with token, skipping start");
    return;
  }

  try {
    _bot = new Bot<BotContext>(config.botToken);

    _bot.use(
      session({
        initial(): SessionData {
          return { language: "uz", page: 0 };
        },
      }),
    );

    // Register all handlers
    registerStorageHandler(_bot);
    registerStartHandler(_bot);
    registerCatalogHandler(_bot);
    registerSubscriptionHandler(_bot);

    // Global error handler
    _bot.catch((err) => {
      logger.error({ err: err.error, ctx: err.ctx?.update }, "Bot error");
    });

    // Start polling in background
    _bot.start({
      onStart: (info) => {
        logger.info(
          { botUsername: info.username },
          "Telegram bot started (polling)",
        );
      },
    });

    _isRunning = true;
  } catch (err) {
    logger.error({ err }, "Failed to start Telegram bot");
    _bot = null;
    _isRunning = false;
  }
}

export async function stopBot(): Promise<void> {
  if (_bot && _isRunning) {
    try {
      await _bot.stop();
      logger.info("Telegram bot stopped");
    } catch (err) {
      logger.warn({ err }, "Error stopping bot");
    }
    _bot = null;
    _isRunning = false;
  }
}

export function isBotRunning(): boolean {
  return _isRunning;
}
