// modules/analytics/interface/http/middleware/analytics-cache.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { AnalyticsCacheService } from '../../../application/services/analytics-cache.service';
import { Logger } from '@/shared/utils/logger';

const logger = Logger.getInstance('AnalyticsCacheMiddleware');

export function analyticsCacheMiddleware(
  prefix: string,
  ttl: number = 300,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cacheService = container.resolve(AnalyticsCacheService);
      
      // Generate cache key from URL and query params
      const url = req.url;
      const params = { ...req.query, ...req.params };
      const key = cacheService.generateKey(prefix, params);

      // Try to get from cache
      const cached = await cacheService.get(key);
      
      if (cached) {
        logger.debug('Cache hit', { key, prefix });
        res.json({
          success: true,
          data: cached,
          meta: {
            cached: true,
            cachedAt: new Date().toISOString(),
          },
        });
        return;
      }

      // Store original send function
      const originalJson = res.json.bind(res);
      
      // Override json to cache response
      res.json = function(data: any) {
        // Only cache successful responses
        if (data.success !== false) {
          cacheService.set(key, data, ttl).catch((err) => {
            logger.warn('Failed to cache response', { key, error: err });
          });
        }
        
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error });
      next();
    }
  };
}