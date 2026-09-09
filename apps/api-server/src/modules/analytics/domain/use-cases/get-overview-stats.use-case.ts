// modules/analytics/domain/use-cases/get-overview-stats.use-case.ts

import { inject, injectable } from 'tsyringe';
import type { IAnalyticsRepository } from '../repositories/analytics.repository.interface';
import { DateRange } from '../value-objects/date-range.vo';
import { OverviewStats } from '../entities/overview-stats.entity';
import { Logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/errors/AppError';

@injectable()
export class GetOverviewStatsUseCase {
  private readonly logger = Logger.getInstance('GetOverviewStatsUseCase');
  private readonly repository: IAnalyticsRepository;

  constructor(
    @inject('IAnalyticsRepository')
    repository: IAnalyticsRepository,
  ) {
    this.repository = repository;
  }

  async execute(dateRange?: DateRange): Promise<OverviewStats> {
    try {
      const startTime = Date.now();
      
      // Default to last 30 days if no range provided
      const range = dateRange || DateRange.fromDays(30);
      
      this.logger.debug('Getting overview stats', {
        start: range.start,
        end: range.end,
      });

      const stats = await this.repository.getOverviewStats(range);

      const duration = Date.now() - startTime;
      this.logger.info('Overview stats retrieved', {
        duration: `${duration}ms`,
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
      });

      return stats;
    } catch (error) {
      this.logger.error('Failed to get overview stats', { error });
      throw new AppError(
        'Failed to retrieve overview statistics',
        500,
      );
    }
  }
}