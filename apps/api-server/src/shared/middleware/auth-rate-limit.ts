import { createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import { Logger } from "@/shared/utils/logger";

interface RedisRateLimitClient {
  status?: string;
  eval(
    script: string,
    numberOfKeys: number,
    key: string,
    windowMs: number,
  ): Promise<unknown>;
}

interface AuthRateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  environment?: string;
  redis?: RedisRateLimitClient | null;
  warn?: (message: string) => void;
}

interface MemoryRateLimitEntry {
  count: number;
  resetAt: number;
}

const logger = Logger.getInstance("AuthRateLimit");
const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      connectTimeout: 1000,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    })
  : null;
const memoryEntries = new Map<string, MemoryRateLimitEntry>();
const warningMessages = new Set<string>();

redisClient?.on("error", () => {
  warnOnce("redis-error", "Redis auth rate limiter is unavailable");
});

const INCREMENT_WITH_TTL = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = ARGV[1]
end
return { count, ttl }
`;

function warnOnce(key: string, message: string): void {
  if (warningMessages.has(key)) return;
  warningMessages.add(key);
  logger.warn(message);
}

function createRateLimitKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "unknown";
  const emailDigest = createHash("sha256").update(email).digest("hex");
  return `auth:${ip}:${emailDigest}`;
}

function incrementMemory(key: string, now: number, windowMs: number): number {
  const current = memoryEntries.get(key);
  if (!current || current.resetAt <= now) {
    if (memoryEntries.size >= 10000) {
      for (const [entryKey, entry] of memoryEntries) {
        if (entry.resetAt <= now) memoryEntries.delete(entryKey);
      }
    }
    if (memoryEntries.size >= 10000) {
      throw new Error("In-process auth limiter capacity reached");
    }
    memoryEntries.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  current.count += 1;
  return current.count;
}

function replyLimited(res: Response, retryAfterSeconds: number): void {
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts, please try again later",
      retryAfter: retryAfterSeconds,
    },
  });
}

function replyUnavailable(res: Response): void {
  res.status(503).json({
    success: false,
    error: {
      code: "AUTH_RATE_LIMIT_UNAVAILABLE",
      message: "Authentication is temporarily unavailable",
    },
  });
}

export function createAuthRateLimit(options: AuthRateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const maxRequests = options.maxRequests ?? 5;
  const environment =
    options.environment ?? process.env.NODE_ENV ?? "development";
  const redis = options.redis === undefined ? redisClient : options.redis;
  const warn = options.warn ?? ((message: string) => logger.warn(message));
  const warnOnceForLimiter = (key: string, message: string): void => {
    if (warningMessages.has(key)) return;
    warningMessages.add(key);
    warn(message);
  };

  if (!redis && environment !== "production") {
    warnOnceForLimiter(
      `memory-fallback:${environment}`,
      "Auth rate limiter is using process-local storage",
    );
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = createRateLimitKey(req);
    const now = Date.now();

    void (async () => {
      let count: number;
      let retryAfterSeconds: number;

      if (redis) {
        try {
          if (redis.status !== undefined && redis.status !== "ready") {
            throw new Error("Redis auth rate limiter is not ready");
          }
          const result = await redis.eval(INCREMENT_WITH_TTL, 1, key, windowMs);
          if (!Array.isArray(result) || result.length < 2) {
            throw new Error("Unexpected Redis auth limiter response");
          }
          count = Number(result[0]);
          retryAfterSeconds = Math.max(1, Math.ceil(Number(result[1]) / 1000));
          if (!Number.isSafeInteger(count) || count < 1) {
            throw new Error("Invalid Redis auth limiter count");
          }
        } catch {
          if (environment === "production") {
            warnOnceForLimiter(
              "redis-fail-closed",
              "Redis auth rate limiter failed closed",
            );
            replyUnavailable(res);
            return;
          }
          warnOnceForLimiter(
            "redis-memory-fallback",
            "Redis auth rate limiter failed; using process-local storage",
          );
          try {
            count = incrementMemory(key, now, windowMs);
            retryAfterSeconds = Math.max(
              1,
              Math.ceil(
                ((memoryEntries.get(key)?.resetAt ?? now) - now) / 1000,
              ),
            );
          } catch {
            replyUnavailable(res);
            return;
          }
        }
      } else {
        try {
          count = incrementMemory(key, now, windowMs);
          retryAfterSeconds = Math.max(
            1,
            Math.ceil(((memoryEntries.get(key)?.resetAt ?? now) - now) / 1000),
          );
        } catch {
          replyUnavailable(res);
          return;
        }
      }

      res.setHeader("X-RateLimit-Limit", String(maxRequests));
      res.setHeader(
        "X-RateLimit-Remaining",
        String(Math.max(0, maxRequests - count)),
      );
      if (count > maxRequests) {
        replyLimited(res, retryAfterSeconds);
        return;
      }
      next();
    })().catch(() => {
      replyUnavailable(res);
    });
  };
}

export const authRateLimit = createAuthRateLimit();
