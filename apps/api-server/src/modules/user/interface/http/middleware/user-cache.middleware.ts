// modules/user/interface/http/middleware/user-cache.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { UserCacheService } from '../../../application/services/user-cache.service';
import { Logger } from '@/shared/utils/logger';

const logger = Logger.getInstance('UserCacheMiddleware');

export function userCacheMiddleware(
  ttl: number = 300,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cacheService = container.resolve(UserCacheService);
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!userId) {
        return next();
      }

      // Try to get from cache
      const cached = await cacheService.get(userId);

      if (cached) {
        logger.debug('User cache hit', { userId });

        // Store original send function
        const originalJson = res.json.bind(res);

        res.json = function(data: any) {
          return originalJson({
            ...data,
            meta: {
              ...data.meta,
              cached: true,
              cachedAt: new Date().toISOString(),
            },
          });
        };

        // Attach user to request for later use
        (req as any).cachedUser = cached;
        return next();
      }

      // Store original send function to cache response
      const originalJson = res.json.bind(res);

      res.json = function(data: any) {
        // Only cache successful responses with user data
        if (data.success !== false && data.data) {
          // Cache asynchronously without blocking response
          cacheService.set(userId, data.data, ttl).catch(error => {
            logger.warn('Failed to cache user', { userId, error });
          });
          logger.debug('User cached', { userId });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('User cache middleware error', { error });
      next();
    }
  };
}