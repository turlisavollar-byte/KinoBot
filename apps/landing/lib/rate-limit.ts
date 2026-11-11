import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const limit = 5;
const windowMs = 60 * 60 * 1000;
const fallbackMap = new Map<string, { count: number; resetAt: number }>();
let distributedLimiter: Ratelimit | undefined;

function getDistributedLimiter() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return undefined;
  }

  distributedLimiter ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, '1 h'),
    analytics: true,
    prefix: 'ratelimit:contact',
  });

  return distributedLimiter;
}

function checkFallback(ip: string, now: number): RateLimitResult {
  for (const [key, entry] of fallbackMap) {
    if (entry.resetAt <= now) fallbackMap.delete(key);
  }

  const record = fallbackMap.get(ip);
  if (!record || record.resetAt <= now) {
    const reset = now + windowMs;
    fallbackMap.set(ip, { count: 1, resetAt: reset });
    return { success: true, limit, remaining: limit - 1, reset };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, reset: record.resetAt };
  }

  record.count += 1;
  return { success: true, limit, remaining: limit - record.count, reset: record.resetAt };
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const limiter = getDistributedLimiter();
  if (limiter) {
    try {
      const result = await limiter.limit(ip);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (error) {
      console.error('Upstash rate limit error; using local fallback:', error);
    }
  }

  return checkFallback(ip, Date.now());
}