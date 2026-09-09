// modules/analytics/infrastructure/scheduler/analytics-scheduler.ts

import { injectable, inject } from 'tsyringe';
import { AnalyticsService } from '../../application/services/analytics.service';
import { DateRange } from '../../domain/value-objects/date-range.vo';
import { Logger } from '@/shared/utils/logger';
import cron from 'node-cron';

@injectable()
export class AnalyticsScheduler {
  private readonly logger = Logger.getInstance('AnalyticsScheduler');

  constructor(
    @inject('AnalyticsService')
    private readonly analyticsService: AnalyticsService,
  ) {}

  // Initialize all scheduled jobs
  start(): void {
    this.logger.info('Starting analytics scheduler');

    // Pre-compute daily overview stats - every hour
    cron.schedule('0 * * * *', () => {
      this.preComputeDailyStats();
    });

    // Pre-compute weekly stats - every Sunday at midnight
    cron.schedule('0 0 * * 0', () => {
      this.preComputeWeeklyStats();
    });

    // Pre-compute monthly stats - every 1st at midnight
    cron.schedule('0 0 1 * *', () => {
      this.preComputeMonthlyStats();
    });

    // Clean up old cache - every day at 2 AM
    cron.schedule('0 2 * * *', () => {
      this.cleanUpCache();
    });

    // Generate reports - every Monday at 6 AM
    cron.schedule('0 6 * * 1', () => {
      this.generateWeeklyReport();
    });

    // Anomaly detection - every 15 minutes
    cron.schedule('*/15 * * * *', () => {
      this.detectAnomalies();
    });

    this.logger.info('Analytics scheduler started');
  }

  private async preComputeDailyStats(): Promise<void> {
    try {
      this.logger.info('Pre-computing daily stats');
      
      const dateRange = DateRange.fromDays(1);

      // Compute and cache overview stats
      await this.analyticsService.getOverviewStats(dateRange);
      
      this.logger.info('Daily stats pre-computed successfully');
    } catch (error) {
      this.logger.error('Failed to pre-compute daily stats', { error });
    }
  }

  private async preComputeWeeklyStats(): Promise<void> {
    try {
      this.logger.info('Pre-computing weekly stats');
      
      const dateRange = DateRange.fromDays(7);

      await Promise.all([
        this.analyticsService.getOverviewStats(dateRange),
        this.analyticsService.getRevenueTrend(dateRange),
        this.analyticsService.getTopContent(dateRange, 20, 0),
        this.analyticsService.getSubscriptionTrend(dateRange),
      ]);

      this.logger.info('Weekly stats pre-computed successfully');
    } catch (error) {
      this.logger.error('Failed to pre-compute weekly stats', { error });
    }
  }

  private async preComputeMonthlyStats(): Promise<void> {
    try {
      this.logger.info('Pre-computing monthly stats');
      
      const dateRange = DateRange.fromDays(30);

      await Promise.all([
        this.analyticsService.getOverviewStats(dateRange),
        this.analyticsService.getRevenueTrend(dateRange),
        this.analyticsService.getTopContent(dateRange, 50, 0),
        this.analyticsService.getSubscriptionTrend(dateRange),
      ]);

      this.logger.info('Monthly stats pre-computed successfully');
    } catch (error) {
      this.logger.error('Failed to pre-compute monthly stats', { error });
    }
  }

  private async cleanUpCache(): Promise<void> {
    try {
      this.logger.info('Cleaning up analytics cache');
      
      // Only keep cache for last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Invalidate old cache
      await this.analyticsService.invalidateCache();
      
      this.logger.info('Analytics cache cleaned up successfully');
    } catch (error) {
      this.logger.error('Failed to clean up analytics cache', { error });
    }
  }

  private async generateWeeklyReport(): Promise<void> {
    try {
      this.logger.info('Generating weekly report');
      
      // Generate report data
      const dateRange = DateRange.fromDays(7);

      const [overview, revenue, content, subscriptions] = await Promise.all([
        this.analyticsService.getOverviewStats(dateRange),
        this.analyticsService.getRevenueTrend(dateRange),
        this.analyticsService.getTopContent(dateRange, 10, 0),
        this.analyticsService.getSubscriptionTrend(dateRange),
      ]);

      // Here you can send email, save to DB, or push to notification service
      this.logger.info('Weekly report generated', {
        overview: overview.toJSON(),
        revenue: revenue.totalRevenue,
        topContent: content.items.length,
        subscriptions: subscriptions.data.length,
      });
    } catch (error) {
      this.logger.error('Failed to generate weekly report', { error });
    }
  }

  private async detectAnomalies(): Promise<void> {
    try {
      this.logger.debug('Detecting anomalies in analytics data');
      
      // Get recent stats for comparison
      const recentDateRange = DateRange.fromDays(1);
      const previousDateRange = DateRange.create(
        new Date(Date.now() - 48 * 60 * 60 * 1000),
        new Date(Date.now() - 24 * 60 * 60 * 1000),
      );
      
      const [recentStats, previousStats] = await Promise.all([
        this.analyticsService.getOverviewStats(recentDateRange),
        this.analyticsService.getOverviewStats(previousDateRange),
      ]);
      
      // Compare and detect anomalies (simplified example)
      const userGrowthRate = previousStats.totalUsers > 0
        ? ((recentStats.totalUsers - previousStats.totalUsers) / previousStats.totalUsers) * 100
        : 0;
      
      if (userGrowthRate > 50) {
        this.logger.warn('Unusual user growth detected', { growthRate: userGrowthRate });
      }
      
      if (recentStats.watchSessionsToday < previousStats.watchSessionsToday * 0.5) {
        this.logger.warn('Unusual drop in watch sessions detected', {
          recent: recentStats.watchSessionsToday,
          previous: previousStats.watchSessionsToday,
        });
      }
      
      this.logger.debug('Anomaly detection completed');
    } catch (error) {
      this.logger.error('Failed to detect anomalies', { error });
    }
  }
}