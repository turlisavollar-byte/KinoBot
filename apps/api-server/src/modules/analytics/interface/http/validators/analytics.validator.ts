// modules/analytics/interface/http/validators/analytics.validator.ts

import { z } from 'zod';

export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['7d', '30d', '90d', '1y']).optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be before end date',
    path: ['startDate'],
  },
);

export const TopContentSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(['movie', 'series', 'episode']).optional(),
  sortBy: z.enum(['views', 'rating', 'engagement']).default('views'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const RevenueTrendSchema = z.object({
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  includeRefunds: z.coerce.boolean().default(false),
  currency: z.string().default('USD'),
});

export const SubscriptionTrendSchema = z.object({
  includeBreakdown: z.coerce.boolean().default(false),
});

export const VideoCodeStatsSchema = z.object({
  groupBy: z.enum(['status', 'channel']).optional(),
});

export const AcquisitionStatsSchema = z.object({
  groupBy: z.enum(['source', 'campaign', 'channel']).default('source'),
});