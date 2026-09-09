// modules/user/infrastructure/cache/redis-user-cache.ts

import { Redis } from 'ioredis';
import { Logger } from '@/shared/utils/logger';

export class RedisUserCache {
  private readonly logger = Logger.getInstance('RedisUserCache');
  private readonly redis: Redis;
  private readonly defaultTTL: number;

  constructor(redisUrl?: string, defaultTTL: number = 300) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.defaultTTL = defaultTTL;
    
    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', { error });
    });
    
    this.redis.on('connect', () => {
      this.logger.info('Redis connected');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error('Failed to get from cache', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;
      
      await this.redis.setex(key, expiry, serialized);
      this.logger.debug('Cache set', { key, ttl: expiry });
    } catch (error) {
      this.logger.error('Failed to set cache', { key, error });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug('Cache deleted', { key });
    } catch (error) {
      this.logger.error('Failed to delete cache', { key, error });
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug('Cache pattern deleted', { pattern, count: keys.length });
      }
    } catch (error) {
      this.logger.error('Failed to delete cache pattern', { pattern, error });
    }
  }

  async invalidateUser(userId: string): Promise<void> {
    try {
      await this.deletePattern(`user:${userId}:*`);
      await this.deletePattern(`users:list:*`);
      this.logger.info('User cache invalidated', { userId });
    } catch (error) {
      this.logger.error('Failed to invalidate user cache', { userId, error });
    }
  }

  async invalidateAllUsers(): Promise<void> {
    try {
      await this.deletePattern('user:*');
      await this.deletePattern('users:*');
      this.logger.info('All user cache invalidated');
    } catch (error) {
      this.logger.error('Failed to invalidate all user cache', { error });
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
    this.logger.info('Redis disconnected');
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed', { error });
      return false;
    }
  }
}

// Singleton instance
let redisUserCacheInstance: RedisUserCache | null = null;

export function getRedisUserCache(): RedisUserCache {
  if (!redisUserCacheInstance) {
    redisUserCacheInstance = new RedisUserCache();
  }
  return redisUserCacheInstance;
}