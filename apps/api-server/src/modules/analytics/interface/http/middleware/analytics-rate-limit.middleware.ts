// modules/analytics/interface/http/middleware/analytics-rate-limit.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { Logger } from '@/shared/utils/logger';

const logger = Logger.getInstance('AnalyticsRateLimit');

export const analyticsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many analytics requests, please try again later',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Analytics rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: (req as any).user?.id,
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many analytics requests, please try again later',
        timestamp: new Date().toISOString(),
      },
    });
  },
});

// Stricter limit for heavy queries
export const analyticsHeavyQueryRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many heavy analytics queries',
      timestamp: new Date().toISOString(),
    },
  },
});