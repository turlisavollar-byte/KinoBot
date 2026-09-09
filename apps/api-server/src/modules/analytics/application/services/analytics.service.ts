// modules/analytics/application/services/analytics.service.ts

import { inject, injectable } from 'tsyringe';
import type { IAnalyticsRepository } from '../../domain/repositories/analytics.repository.interface';
import { AnalyticsCacheService } from './analytics-cache.service';
import { DateRange } from '../../domain/value-objects/date-range.vo';
import { OverviewStats, OverviewStatsProps } from '../../domain/entities/overview-stats.entity';
import { RevenueTrend, RevenueTrendProps } from '../../domain/entities/revenue-trend.entity';
import { TopContent, TopContentProps } from '../../domain/entities/top-content.entity';
import { SubscriptionTrend, SubscriptionTrendProps } from '../../domain/entities/subscription-trend.entity';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class AnalyticsService {
  private readonly logger = Logger.getInstance('AnalyticsService');
  private readonly repository: IAnalyticsRepository;
  private readonly cache: AnalyticsCacheService;

  constructor(
    @inject('IAnalyticsRepository')
    repository: IAnalyticsRepository,
    @inject('AnalyticsCacheService')
    cache: AnalyticsCacheService,
  ) {
    this.repository = repository;
    this.cache = cache;
  }

  async getOverviewStats(dateRange?: DateRange): Promise<OverviewStats> {
    const range = dateRange || DateRange.fromDays(30);
    const cacheKey = this.cache.generateKey('overview', {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    });

    // Try cache
    const cached = await this.cache.get<OverviewStats>(cacheKey);
    if (cached) {
      this.logger.debug('Overview stats from cache');
      return OverviewStats.create(cached);
    }

    // Get from repository
    const stats = await this.repository.getOverviewStats(range);
    
    // Cache
    await this.cache.set(cacheKey, stats.toJSON());

    return stats;
  }

  async getRevenueTrend(
    dateRange: DateRange,
    options?: { groupBy?: 'day' | 'week' | 'month'; includeRefunds?: boolean },
  ): Promise<RevenueTrend> {
    const cacheKey = this.cache.generateKey('revenue', {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
      ...options,
    });

    const cached = await this.cache.get<RevenueTrendProps>(cacheKey);
    if (cached) {
      return RevenueTrend.create(cached);
    }

    const trend = await this.repository.getRevenueTrend(dateRange);
    await this.cache.set(cacheKey, trend.toJSON());

    return trend;
  }

  async getTopContent(
    dateRange: DateRange,
    limit: number = 10,
    offset: number = 0,
  ): Promise<TopContent> {
    const cacheKey = this.cache.generateKey('top-content', {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
      limit,
      offset,
    });

    const cached = await this.cache.get<TopContentProps>(cacheKey);
    if (cached) {
      return TopContent.create(cached);
    }

    const content = await this.repository.getTopContent(dateRange, limit, offset);
    await this.cache.set(cacheKey, content.toJSON());

    return content;
  }

  async getSubscriptionTrend(dateRange: DateRange): Promise<SubscriptionTrend> {
    const cacheKey = this.cache.generateKey('subscription-trend', {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
    });

    const cached = await this.cache.get<SubscriptionTrendProps>(cacheKey);
    if (cached) {
      return SubscriptionTrend.create(cached);
    }

    const trend = await this.repository.getSubscriptionTrend(dateRange);
    await this.cache.set(cacheKey, trend.toJSON());

    return trend;
  }

  // Invalidate cache when data changes
  async invalidateCache(): Promise<void> {
    await this.cache.invalidate('analytics');
    this.logger.info('Analytics cache invalidated');
  }
}