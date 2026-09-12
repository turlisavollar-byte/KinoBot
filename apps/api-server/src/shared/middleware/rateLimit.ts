import type { Request, Response, NextFunction } from "express";
import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("RateLimit");

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitStore>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => {
      const ip = req.ip || req.connection.remoteAddress || "unknown";
      return ip;
    },
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Clean up expired entries
    if (rateLimitStore.size > 10000) {
      const now = Date.now();
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.resetTime < now) {
          rateLimitStore.delete(k);
        }
      }
    }

    const record = rateLimitStore.get(key);

    if (!record || record.resetTime < now) {
      // Create new record or reset expired one
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    // Check if limit exceeded
    if (record.count >= maxRequests) {
      const resetAfter = Math.ceil((record.resetTime - now) / 1000);
      
      logger.warn("Rate limit exceeded", {
        key,
        count: record.count,
        maxRequests,
        resetAfter,
        path: req.path,
      });

      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests, please try again later",
          retryAfter: resetAfter,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Increment counter
    record.count++;

    // Setup response headers
    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", (maxRequests - record.count).toString());
    res.setHeader("X-RateLimit-Reset", new Date(record.resetTime).toISOString());

    // Wrap response to track success/failure
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        const isSuccess = res.statusCode < 400;
        
        if (skipSuccessfulRequests && isSuccess) {
          record.count--;
        } else if (skipFailedRequests && !isSuccess) {
          record.count--;
        }
        
        return originalJson(data);
      };
    }

    next();
  };
}

// Pre-configured rate limiters for common use cases
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const email = req.body?.email || "unknown";
    return `auth:${ip}:${email}`;
  },
});

export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  keyGenerator: (req) => {
    const user = (req as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    return `ip:${ip}`;
  },
});
