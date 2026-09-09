// modules/analytics/domain/use-cases/get-revenue-trend.use-case.ts

import { inject, injectable } from 'tsyringe';
import type { IAnalyticsRepository } from '../repositories/analytics.repository.interface';
import { DateRange } from '../value-objects/date-range.vo';
import { RevenueTrend } from '../entities/revenue-trend.entity';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class GetRevenueTrendUseCase {
  private readonly logger = Logger.getInstance('GetRevenueTrendUseCase');
  private readonly repository: IAnalyticsRepository;

  constructor(
    @inject('IAnalyticsRepository')
    repository: IAnalyticsRepository,
  ) {
    this.repository = repository;
  }

  async execute(
    dateRange: DateRange,
    options?: {
      groupBy?: 'day' | 'week' | 'month';
      includeRefunds?: boolean;
    },
  ): Promise<RevenueTrend> {
    const startTime = Date.now();

    this.logger.debug('Getting revenue trend', {
      start: dateRange.start,
      end: dateRange.end,
      options,
    });

    const trend = await this.repository.getRevenueTrend(dateRange);

    const duration = Date.now() - startTime;
    this.logger.info('Revenue trend retrieved', {
      duration: `${duration}ms`,
      dataPoints: trend.data.length,
      totalRevenue: trend.totalRevenue,
    });

    return trend;
  }
}