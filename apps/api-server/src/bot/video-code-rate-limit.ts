import Redis from "ioredis";
import { Logger } from "@/shared/utils/logger";

const WINDOW_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const MAX_MEMORY_ENTRIES = 10_000;
const CLEANUP_INTERVAL = 256;
const KEY_PREFIX = "bot:video-code:attempts:";

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryEntries = new Map<string, MemoryEntry>();
let cleanupCounter = 0;
const logger = Logger.getInstance("VideoCodeRateLimit");
let redis: Redis | null = null;

const INCREMENT_SCRIPT = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return count
`;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 50, 2_000),
    });
    redis.on("error", (error) => {
      logger.error("Video code rate limiter Redis error", {}, error);
    });
  }
  return redis;
}

function cleanupMemory(now: number): void {
  cleanupCounter += 1;
  if (
    memoryEntries.size <= MAX_MEMORY_ENTRIES &&
    cleanupCounter % CLEANUP_INTERVAL !== 0
  ) {
    return;
  }

  for (const [key, entry] of memoryEntries) {
    if (entry.resetAt <= now) memoryEntries.delete(key);
  }

  if (memoryEntries.size <= MAX_MEMORY_ENTRIES) return;

  const excess = memoryEntries.size - MAX_MEMORY_ENTRIES;
  let removed = 0;
  for (const key of memoryEntries.keys()) {
    memoryEntries.delete(key);
    removed += 1;
    if (removed >= excess) break;
  }
}

function checkMemoryLimit(key: string): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  cleanupMemory(now);
  const current = memoryEntries.get(key);

  if (!current || current.resetAt <= now) {
    memoryEntries.set(key, {
      count: 1,
      resetAt: now + WINDOW_SECONDS * 1000,
    });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  current.count += 1;
  if (current.count <= MAX_ATTEMPTS) {
    return { allowed: true, remaining: MAX_ATTEMPTS - current.count };
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export async function checkVideoCodeRateLimit(telegramId: string): Promise<{
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}> {
  const key = `${KEY_PREFIX}${telegramId}`;

  try {
    const client = getRedis();
    if (client) {
      const count = Number(
        await client.eval(INCREMENT_SCRIPT, 1, key, WINDOW_SECONDS),
      );
      if (count <= MAX_ATTEMPTS) {
        return {
          allowed: true,
          remaining: MAX_ATTEMPTS - count,
        };
      }

      let ttl = await client.ttl(key);
      if (ttl < 0) {
        logger.warn("Video code rate limiter Redis key had invalid TTL", {
          key,
          ttl,
        });
        await client.expire(key, WINDOW_SECONDS);
        ttl = WINDOW_SECONDS;
      }
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(ttl, 1),
      };
    }
  } catch (error) {
    logger.warn("Falling back to in-memory video code rate limit", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return checkMemoryLimit(key);
}
