import {
  Bot,
  session,
  type Context,
  type SessionFlavor,
  type StorageAdapter,
} from "grammy";
import Redis from "ioredis";
import { desc, eq } from "drizzle-orm";
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
let _startPromise: Promise<void> | null = null;
let _sessionRedis: Redis | null = null;
let _shutdownHandlersRegistered = false;

const SESSION_TTL_SECONDS = 60 * 60;

function errorSummary(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: "UnknownError", message: String(error) };
}

function createSessionStorage(): StorageAdapter<SessionData> | undefined {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn(
      "REDIS_URL is not configured; Telegram sessions use process memory",
    );
    return undefined;
  }

  _sessionRedis = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 50, 2_000),
  });
  _sessionRedis.on("error", (err) => {
    logger.error({ err: errorSummary(err) }, "Telegram session Redis error");
  });

  const key = (sessionKey: string) => `bot:session:${sessionKey}`;
  return {
    async read(sessionKey) {
      try {
        const value = await _sessionRedis?.get(key(sessionKey));
        return value ? (JSON.parse(value) as SessionData) : undefined;
      } catch (err) {
        logger.error(
          { err: errorSummary(err) },
          "Failed to read Telegram session",
        );
        return undefined;
      }
    },
    async write(sessionKey, value) {
      try {
        await _sessionRedis?.set(
          key(sessionKey),
          JSON.stringify(value),
          "EX",
          SESSION_TTL_SECONDS,
        );
      } catch (err) {
        logger.error(
          { err: errorSummary(err) },
          "Failed to write Telegram session",
        );
      }
    },
    async delete(sessionKey) {
      try {
        await _sessionRedis?.del(key(sessionKey));
      } catch (err) {
        logger.error(
          { err: errorSummary(err) },
          "Failed to delete Telegram session",
        );
      }
    },
  };
}

async function closeSessionRedis(): Promise<void> {
  const client = _sessionRedis;
  _sessionRedis = null;
  if (!client) return;
  try {
    await client.quit();
  } catch (err) {
    logger.warn(
      { error: errorSummary(err) },
      "Failed to close Telegram session Redis",
    );
  }
}

function registerShutdownHandlers(): void {
  if (_shutdownHandlersRegistered) return;
  _shutdownHandlersRegistered = true;

  const shutdown = async (signal: string) => {
    logger.info(`Stopping Telegram bot on ${signal}`);
    await stopBot();
    process.exit(0);
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

export function buildBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  bot.use(
    session({
      initial(): SessionData {
        return { language: "uz", page: 0 };
      },
      storage: createSessionStorage(),
    }),
  );

  registerStorageHandler(bot);
  registerStartHandler(bot);
  registerCatalogHandler(bot);
  registerSubscriptionHandler(bot);

  bot.catch((err) => {
    logger.error(
      {
        err: errorSummary(err.error),
        updateId: err.ctx?.update.update_id,
        fromId: err.ctx?.from?.id,
      },
      "Telegram bot update failed",
    );
  });

  return bot;
}

export function getBot(): Bot<BotContext> | null {
  return _bot;
}

export async function startBot(): Promise<void> {
  if (process.env.TELEGRAM_POLLING_ENABLED === "false") {
    logger.info("Telegram bot polling is disabled by configuration");
    return;
  }

  if (_isRunning && _bot) {
    return;
  }

  if (_startPromise) {
    await _startPromise;
    return;
  }

  _startPromise = (async () => {
    if (_isRunning && _bot) {
      return;
    }

    const [config] = await db
      .select()
      .from(telegramConfigTable)
      .where(eq(telegramConfigTable.isActive, true))
      .orderBy(desc(telegramConfigTable.updatedAt))
      .limit(1);

    if (!config?.botToken) {
      logger.info("Telegram bot: no active config with token, skipping start");
      return;
    }

    try {
      if (_bot) {
        await stopBot();
      }

      _bot = buildBot(config.botToken);
      registerShutdownHandlers();

      _isRunning = true;

      const pollingBot = _bot;
      void pollingBot
        .start({
          allowed_updates: [
            "message",
            "callback_query",
            "my_chat_member",
            "channel_post",
          ],
          drop_pending_updates: true,
          onStart: (info) => {
            logger.info(
              { botUsername: info.username },
              "Telegram bot started (polling)",
            );
          },
        })
        .catch(async (err) => {
          if (_bot !== pollingBot) return;
          logger.error(
            { err: errorSummary(err) },
            "Telegram bot polling failed",
          );
          _bot = null;
          _isRunning = false;
          await closeSessionRedis();
        });
    } catch (err) {
      logger.error({ err: errorSummary(err) }, "Failed to start Telegram bot");
      _bot = null;
      _isRunning = false;
      await closeSessionRedis();
      throw err;
    }
  })();

  try {
    await _startPromise;
  } finally {
    _startPromise = null;
  }
}

export async function stopBot(): Promise<void> {
  const bot = _bot;
  _bot = null;
  _isRunning = false;

  if (bot) {
    try {
      await bot.stop();
      logger.info("Telegram bot stopped");
    } catch (err) {
      logger.warn({ error: errorSummary(err) }, "Error stopping Telegram bot");
    }
  }

  await closeSessionRedis();
}

export function isBotRunning(): boolean {
  return _isRunning;
}
