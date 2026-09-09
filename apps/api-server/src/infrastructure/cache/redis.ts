/**
 * Redis cache client — STUB
 *
 * TODO: Install ioredis and configure Redis connection.
 *   pnpm --filter @workspace/api-server add ioredis
 *   Set REDIS_URL env var.
 *
 * Usage pattern (once implemented):
 *   await cache.set("key", JSON.stringify(value), "EX", 300);
 *   const cached = await cache.get("key");
 */

import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("Redis");

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(): Promise<void>;
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

// In development, use in-memory cache; swap with Redis in production
export const cache: CacheClient = new InMemoryCache();

logger.info("Cache: using in-memory (stub). Wire Redis for production.");
