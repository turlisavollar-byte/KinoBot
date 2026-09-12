/**
 * Redis cache client
 *
 * Usage pattern:
 *   await cache.set("key", JSON.stringify(value), 300);
 *   const cached = await cache.get("key");
 */

import Redis from "ioredis";
import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("Redis");

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(): Promise<void>;
}

class RedisCache implements CacheClient {
  private client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.client = new Redis(redisUrl);

    this.client.on("connect", () => {
      logger.info("Redis connected successfully");
    });

    this.client.on("error", (error) => {
      logger.error("Redis connection error:", undefined, error);
    });

    this.client.on("close", () => {
      logger.warn("Redis connection closed");
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error("Redis get error:", undefined, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error("Redis set error:", undefined, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error("Redis del error:", undefined, error);
    }
  }

  async flush(): Promise<void> {
    try {
      await this.client.flushdb();
    } catch (error) {
      logger.error("Redis flush error:", undefined, error);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

class InMemoryCache implements CacheClient {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async flush(): Promise<void> {
    this.store.clear();
  }
}

// Use Redis if REDIS_URL is configured, otherwise use in-memory cache
export const cache: CacheClient = process.env.REDIS_URL
  ? new RedisCache()
  : new InMemoryCache();

if (process.env.REDIS_URL) {
  logger.info("Cache: using Redis");
} else {
  logger.info("Cache: using in-memory (no REDIS_URL configured)");
}
