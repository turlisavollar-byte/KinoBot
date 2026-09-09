// modules/analytics/domain/repositories/analytics.repository.interface.ts

import { DateRange } from '../value-objects/date-range.vo';
import { OverviewStats } from '../entities/overview-stats.entity';
import { RevenueTrend } from '../entities/revenue-trend.entity';
import { TopContent } from '../entities/top-content.entity';
import { SubscriptionTrend } from '../entities/subscription-trend.entity';

export interface IAnalyticsRepository {
  // Overview
  getOverviewStats(dateRange: DateRange): Promise<OverviewStats>;
  getHistoricalOverview(days: number): Promise<OverviewStats[]>;
  
  // Revenue
  getRevenueTrend(dateRange: DateRange): Promise<RevenueTrend>;
  getRevenueByDay(dateRange: DateRange): Promise<Array<{ date: string; revenue: number }>>;
  
  // Content
  getTopContent(dateRange: DateRange, limit: number, offset: number): Promise<TopContent>;
  getContentStats(contentId: string): Promise<{
    views: number;
    uniqueViewers: number;
    avgWatchTime: number;
    completionRate: number;
  }>;
  
  // Subscriptions
  getSubscriptionTrend(dateRange: DateRange): Promise<SubscriptionTrend>;
  getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    trial: number;
    cancelled: number;
    expired: number;
  }>;
  
  // Users
  getUserGrowth(dateRange: DateRange): Promise<Array<{ date: string; count: number }>>;
  getUserRetention(dateRange: DateRange): Promise<number>;
  getAcquisitionStats(dateRange: DateRange): Promise<Array<{ source: string; count: number }>>;
  
  // Video Codes
  getVideoCodeStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    views: number;
    byChannel: Array<{ channelId: string; count: number }>;
  }>;
  
  // Real-time
  getRealTimeStats(): Promise<{
    activeUsers: number;
    currentViews: number;
    recentEvents: number;
    timestamp: Date;
  }>;
}