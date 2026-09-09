// modules/analytics/application/services/analytics-cache.service.ts

import { inject, injectable } from 'tsyringe';
import { Redis } from 'ioredis';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class AnalyticsCacheService {
  private readonly logger = Logger.getInstance('AnalyticsCacheService');
  private readonly defaultTTL = 300; // 5 minutes

  constructor(
    @inject('RedisClient') private readonly redis: Redis,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      this.logger.warn('Cache get failed', { key, error });
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      this.logger.warn('Cache set failed', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn('Cache delete failed', { key, error });
    }
  }

  async invalidate(prefix: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`${prefix}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.info('Cache invalidated', { prefix, count: keys.length });
      }
    } catch (error) {
      this.logger.warn('Cache invalidation failed', { prefix, error });
    }
  }

  generateKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, unknown>);
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }
}