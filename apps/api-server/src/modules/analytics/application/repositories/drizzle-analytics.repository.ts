// modules/analytics/application/repositories/drizzle-analytics.repository.ts

import { injectable } from "tsyringe";
import {
  and,
  eq,
  gte,
  lte,
  desc,
  count,
  sql,
  sum,
  avg,
  countDistinct,
} from "drizzle-orm";
import {
  db,
  usersTable,
  moviesTable,
  seriesTable,
  episodesTable,
  subscriptionsTable,
  watchSessionsTable,
  paymentsTable,
  videoCodesTable,
  telegramChannelsTable,
} from "@workspace/db";
import { IAnalyticsRepository } from "../../domain/repositories/analytics.repository.interface";
import { DateRange } from "../../domain/value-objects/date-range.vo";
import { OverviewStats } from "../../domain/entities/overview-stats.entity";
import { RevenueTrend } from "../../domain/entities/revenue-trend.entity";
import { TopContent } from "../../domain/entities/top-content.entity";
import { SubscriptionTrend } from "../../domain/entities/subscription-trend.entity";
import { Logger } from "@/shared/utils/logger";

@injectable()
export class DrizzleAnalyticsRepository implements IAnalyticsRepository {
  private readonly logger = Logger.getInstance("DrizzleAnalyticsRepository");

  // ==================== Overview ====================

  async getOverviewStats(dateRange: DateRange): Promise<OverviewStats> {
    const startTime = Date.now();

    // Run all queries in parallel for performance
    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalMovies,
      totalSeries,
      totalEpisodes,
      activeSubscriptions,
      totalRevenue,
      monthlyRevenue,
      dailyRevenue,
      watchSessions,
      watchSessionsWeek,
      totalWatchMinutes,
      averageWatchTime,
      videoCodes,
      activeVideoCodes,
      totalCodeViews,
    ] = await Promise.all([
      this.getTotalUsers(),
      this.getActiveUsers(),
      this.getNewUsers(dateRange),
      this.getTotalMovies(),
      this.getTotalSeries(),
      this.getTotalEpisodes(),
      this.getActiveSubscriptions(),
      this.getTotalRevenue(),
      this.getMonthlyRevenue(),
      this.getDailyRevenue(),
      this.getWatchSessionsToday(),
      this.getWatchSessionsWeek(),
      this.getTotalWatchMinutes(),
      this.getAverageWatchTime(),
      this.getTotalVideoCodes(),
      this.getActiveVideoCodes(),
      this.getTotalCodeViews(),
    ]);

    // Calculate retention and churn
    const [retentionRate, churnRate] = await Promise.all([
      this.calculateRetentionRate(dateRange),
      this.calculateChurnRate(dateRange),
    ]);

    const duration = Date.now() - startTime;
    this.logger.debug("Overview stats retrieved", {
      duration: `${duration}ms`,
    });

    return OverviewStats.create({
      totalUsers,
      activeUsers,
      newUsersToday: newUsers.today,
      newUsersThisWeek: newUsers.thisWeek,
      newUsersThisMonth: newUsers.thisMonth,
      totalMovies,
      totalSeries,
      totalEpisodes,
      activeSubscriptions,
      totalRevenue,
      monthlyRevenue,
      dailyRevenue,
      watchSessionsToday: watchSessions,
      watchSessionsThisWeek: watchSessionsWeek,
      totalWatchMinutes,
      averageWatchTime,
      userRetentionRate: retentionRate,
      churnRate,
      videoCodesTotal: videoCodes,
      videoCodesActive: activeVideoCodes,
      totalCodeViews,
      timestamp: new Date(),
    });
  }

  async getHistoricalOverview(days: number): Promise<OverviewStats[]> {
    const results: OverviewStats[] = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const range = DateRange.create(start, end);
      const stats = await this.getOverviewStats(range);
      results.push(stats);
    }

    return results;
  }

  // ==================== Revenue ====================

  async getRevenueTrend(dateRange: DateRange): Promise<RevenueTrend> {
    const startTime = Date.now();

    const data = await db
      .select({
        date: sql<string>`DATE(${paymentsTable.createdAt})`,
        revenue: sql<number>`SUM(${paymentsTable.amount})`,
        transactions: count(),
        refunds: sql<number>`SUM(CASE WHEN ${paymentsTable.status} = 'refunded' THEN ${paymentsTable.amount} ELSE 0 END)`,
        currency: paymentsTable.currency,
      })
      .from(paymentsTable)
      .where(
        and(
          gte(paymentsTable.createdAt, dateRange.start),
          lte(paymentsTable.createdAt, dateRange.end),
          eq(paymentsTable.status, "completed"),
        ),
      )
      .groupBy(sql`DATE(${paymentsTable.createdAt})`, paymentsTable.currency)
      .orderBy(sql`DATE(${paymentsTable.createdAt})`);

    const totalRevenue = data.reduce((sum, d) => sum + Number(d.revenue), 0);
    const totalTransactions = data.reduce(
      (sum, d) => sum + Number(d.transactions),
      0,
    );

    const revenueData = data.map((d) => ({
      date: d.date,
      revenue: Number(d.revenue),
      transactions: Number(d.transactions),
      averageTransactionValue:
        Number(d.transactions) > 0
          ? Number(d.revenue) / Number(d.transactions)
          : 0,
      refunds: Number(d.refunds),
      netRevenue: Number(d.revenue) - Number(d.refunds),
      currency: d.currency || "USD",
    }));

    // Calculate growth rate
    const firstHalf = revenueData.slice(0, Math.floor(revenueData.length / 2));
    const secondHalf = revenueData.slice(Math.floor(revenueData.length / 2));
    const firstAvg =
      firstHalf.reduce((s, d) => s + d.revenue, 0) / (firstHalf.length || 1);
    const secondAvg =
      secondHalf.reduce((s, d) => s + d.revenue, 0) / (secondHalf.length || 1);
    const growthRate =
      firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    const duration = Date.now() - startTime;
    this.logger.debug("Revenue trend retrieved", {
      duration: `${duration}ms`,
      dataPoints: revenueData.length,
      totalRevenue,
    });

    return RevenueTrend.create({
      period: "daily",
      data: revenueData,
      totalRevenue,
      totalTransactions,
      averageRevenue:
        revenueData.length > 0 ? totalRevenue / revenueData.length : 0,
      growthRate,
      startDate: dateRange.start,
      endDate: dateRange.end,
    });
  }

  async getRevenueByDay(
    dateRange: DateRange,
  ): Promise<Array<{ date: string; revenue: number }>> {
    const result = await db
      .select({
        date: sql<string>`DATE(${paymentsTable.createdAt})`,
        revenue: sql<number>`SUM(${paymentsTable.amount})`,
      })
      .from(paymentsTable)
      .where(
        and(
          gte(paymentsTable.createdAt, dateRange.start),
          lte(paymentsTable.createdAt, dateRange.end),
          eq(paymentsTable.status, "completed"),
        ),
      )
      .groupBy(sql`DATE(${paymentsTable.createdAt})`)
      .orderBy(sql`DATE(${paymentsTable.createdAt})`);

    return result.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue),
    }));
  }

  // ==================== Content ====================

  async getTopContent(
    dateRange: DateRange,
    limit: number,
    offset: number,
  ): Promise<TopContent> {
    const startTime = Date.now();

    // Get top movies
    const movies = await db
      .select({
        id: moviesTable.id,
        title: moviesTable.title,
        type: sql<string>`'movie'`,
        viewCount: count(watchSessionsTable.id),
        uniqueViewers: countDistinct(watchSessionsTable.userId),
        totalWatchTime: sum(watchSessionsTable.durationWatched),
        averageWatchTime: avg(watchSessionsTable.durationWatched),
        completionRate: sql<number>`AVG(CASE WHEN ${watchSessionsTable.completedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        rating: sql<number>`COALESCE(AVG(${moviesTable.ratingAvg}), 0)`,
        ratingCount: sql<number>`COALESCE(COUNT(${moviesTable.ratingAvg}), 0)`,
        posterUrl: moviesTable.posterUrl,
      })
      .from(watchSessionsTable)
      .innerJoin(
        moviesTable,
        and(
          eq(watchSessionsTable.contentId, moviesTable.id),
          eq(watchSessionsTable.contentType, "movie"),
        ),
      )
      .where(
        and(
          gte(watchSessionsTable.createdAt, dateRange.start),
          lte(watchSessionsTable.createdAt, dateRange.end),
        ),
      )
      .groupBy(moviesTable.id, moviesTable.title, moviesTable.posterUrl)
      .orderBy(desc(count(watchSessionsTable.id)))
      .limit(limit)
      .offset(offset);

    // Get top series
    const series = await db
      .select({
        id: seriesTable.id,
        title: seriesTable.title,
        type: sql<string>`'series'`,
        viewCount: count(watchSessionsTable.id),
        uniqueViewers: countDistinct(watchSessionsTable.userId),
        totalWatchTime: sum(watchSessionsTable.durationWatched),
        averageWatchTime: avg(watchSessionsTable.durationWatched),
        completionRate: sql<number>`AVG(CASE WHEN ${watchSessionsTable.completedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        rating: sql<number>`COALESCE(AVG(${seriesTable.ratingAvg}), 0)`,
        ratingCount: sql<number>`COALESCE(COUNT(${seriesTable.ratingAvg}), 0)`,
        posterUrl: seriesTable.posterUrl,
      })
      .from(watchSessionsTable)
      .innerJoin(
        seriesTable,
        and(
          eq(watchSessionsTable.contentId, seriesTable.id),
          eq(watchSessionsTable.contentType, "series"),
        ),
      )
      .where(
        and(
          gte(watchSessionsTable.createdAt, dateRange.start),
          lte(watchSessionsTable.createdAt, dateRange.end),
        ),
      )
      .groupBy(seriesTable.id, seriesTable.title, seriesTable.posterUrl)
      .orderBy(desc(count(watchSessionsTable.id)))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(watchSessionsTable)
      .where(
        and(
          gte(watchSessionsTable.createdAt, dateRange.start),
          lte(watchSessionsTable.createdAt, dateRange.end),
        ),
      );

    // Combine and sort
    const allContent = [...movies, ...series]
      .map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type as "movie" | "series",
        viewCount: Number(item.viewCount),
        uniqueViewers: Number(item.uniqueViewers),
        totalWatchTime: Number(item.totalWatchTime || 0),
        averageWatchTime: Number(item.averageWatchTime || 0),
        completionRate: Number(item.completionRate || 0),
        rating: Number(item.rating || 0),
        ratingCount: Number(item.ratingCount || 0),
        posterUrl: item.posterUrl || undefined,
        viewsGrowth: 0, // Calculate from historical data
        engagementScore: this.calculateEngagementScore(item),
      }))
      .sort((a, b) => b.viewCount - a.viewCount);

    const totalViews = allContent.reduce(
      (sum, item) => sum + item.viewCount,
      0,
    );
    const averageViews =
      allContent.length > 0 ? totalViews / allContent.length : 0;

    const duration = Date.now() - startTime;
    this.logger.debug("Top content retrieved", {
      duration: `${duration}ms`,
      count: allContent.length,
      totalViews,
    });

    return TopContent.create({
      items: allContent.slice(0, limit),
      totalViews,
      averageViews,
      period: {
        start: dateRange.start,
        end: dateRange.end,
      },
      limit,
      offset,
      hasMore: allContent.length > limit + offset,
    });
  }

  async getContentStats(contentId: string): Promise<{
    views: number;
    uniqueViewers: number;
    avgWatchTime: number;
    completionRate: number;
  }> {
    const result = await db
      .select({
        views: count(),
        uniqueViewers: countDistinct(watchSessionsTable.userId),
        avgWatchTime: avg(watchSessionsTable.durationWatched),
        completionRate: sql<number>`AVG(CASE WHEN ${watchSessionsTable.completedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
      })
      .from(watchSessionsTable)
      .where(eq(watchSessionsTable.contentId, contentId));

    const stats = result[0] || {
      views: 0,
      uniqueViewers: 0,
      avgWatchTime: 0,
      completionRate: 0,
    };

    return {
      views: Number(stats.views),
      uniqueViewers: Number(stats.uniqueViewers),
      avgWatchTime: Number(stats.avgWatchTime || 0),
      completionRate: Number(stats.completionRate || 0),
    };
  }

  // ==================== Subscriptions ====================

  async getSubscriptionTrend(dateRange: DateRange): Promise<SubscriptionTrend> {
    const subscriptions = await db
      .select({
        date: sql<string>`DATE(${subscriptionsTable.createdAt})`,
        newSubscriptions: count(),
        cancellations: sql<number>`SUM(CASE WHEN ${subscriptionsTable.status} = 'cancelled' THEN 1 ELSE 0 END)`,
        active: sql<number>`SUM(CASE WHEN ${subscriptionsTable.status} = 'active' THEN 1 ELSE 0 END)`,
        trial: sql<number>`SUM(CASE WHEN ${subscriptionsTable.status} = 'trial' THEN 1 ELSE 0 END)`,
        expired: sql<number>`SUM(CASE WHEN ${subscriptionsTable.status} = 'expired' THEN 1 ELSE 0 END)`,
      })
      .from(subscriptionsTable)
      .where(
        and(
          gte(subscriptionsTable.createdAt, dateRange.start),
          lte(subscriptionsTable.createdAt, dateRange.end),
        ),
      )
      .groupBy(sql`DATE(${subscriptionsTable.createdAt})`)
      .orderBy(sql`DATE(${subscriptionsTable.createdAt})`);

    const data = subscriptions.map((s) => ({
      date: s.date,
      newSubscriptions: Number(s.newSubscriptions),
      cancellations: Number(s.cancellations),
      active: Number(s.active),
      trial: Number(s.trial || 0),
      expired: Number(s.expired || 0),
    }));

    const totalNew = data.reduce((sum, d) => sum + d.newSubscriptions, 0);
    const totalCancelled = data.reduce((sum, d) => sum + d.cancellations, 0);

    return SubscriptionTrend.create({
      data,
      totalNew,
      totalCancelled,
      netGrowth: totalNew - totalCancelled,
      startDate: dateRange.start,
      endDate: dateRange.end,
    });
  }

  async getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    trial: number;
    cancelled: number;
    expired: number;
  }> {
    const results = await db
      .select({
        status: subscriptionsTable.status,
        count: count(),
      })
      .from(subscriptionsTable)
      .groupBy(subscriptionsTable.status);

    const stats = {
      total: 0,
      active: 0,
      trial: 0,
      cancelled: 0,
      expired: 0,
    };

    for (const row of results) {
      stats.total += Number(row.count);
      if (row.status === "active") stats.active = Number(row.count);
      if (row.status === "trial") stats.trial = Number(row.count);
      if (row.status === "cancelled") stats.cancelled = Number(row.count);
      if (row.status === "expired") stats.expired = Number(row.count);
    }

    return stats;
  }

  // ==================== Users ====================

  async getUserGrowth(
    dateRange: DateRange,
  ): Promise<Array<{ date: string; count: number }>> {
    const result = await db
      .select({
        date: sql<string>`DATE(${usersTable.createdAt})`,
        count: count(),
      })
      .from(usersTable)
      .where(
        and(
          gte(usersTable.createdAt, dateRange.start),
          lte(usersTable.createdAt, dateRange.end),
        ),
      )
      .groupBy(sql`DATE(${usersTable.createdAt})`)
      .orderBy(sql`DATE(${usersTable.createdAt})`);

    return result.map((r) => ({
      date: r.date,
      count: Number(r.count),
    }));
  }

  async getUserRetention(dateRange: DateRange): Promise<number> {
    // Calculate retention: users who came back after 7 days
    const sevenDaysLater = new Date(
      dateRange.start.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    const result = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN created_at >= ${dateRange.start} AND created_at <= ${dateRange.end} 
          THEN user_id 
        END) as retained,
        COUNT(DISTINCT user_id) as total
      FROM watch_sessions 
      WHERE created_at >= ${dateRange.start} 
      AND created_at <= ${sevenDaysLater}
    `);

    const row = result.rows[0];
    return row && Number(row.total) > 0
      ? (Number(row.retained) / Number(row.total)) * 100
      : 0;
  }

  async getAcquisitionStats(
    dateRange: DateRange,
  ): Promise<Array<{ source: string; count: number }>> {
    const result = await db
      .select({
        source: usersTable.acquisitionSource,
        count: count(),
      })
      .from(usersTable)
      .where(
        and(
          gte(usersTable.createdAt, dateRange.start),
          lte(usersTable.createdAt, dateRange.end),
          sql`${usersTable.acquisitionSource} IS NOT NULL`,
        ),
      )
      .groupBy(usersTable.acquisitionSource)
      .orderBy(desc(count()));

    return result.map((r) => ({
      source: r.source || "organic",
      count: Number(r.count),
    }));
  }

  // ==================== Video Codes ====================

  async getVideoCodeStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    views: number;
    byChannel: Array<{ channelId: string; count: number }>;
  }> {
    const [total, byStatus, byChannel, totalViews] = await Promise.all([
      db.select({ value: count() }).from(videoCodesTable),
      db
        .select({
          status: videoCodesTable.status,
          count: count(),
        })
        .from(videoCodesTable)
        .groupBy(videoCodesTable.status),
      db
        .select({
          channelId: videoCodesTable.channelId,
          count: count(),
        })
        .from(videoCodesTable)
        .where(sql`${videoCodesTable.channelId} IS NOT NULL`)
        .groupBy(videoCodesTable.channelId)
        .orderBy(desc(count())),
      db
        .select({
          views: sql<number>`SUM(${videoCodesTable.viewsCount})`,
        })
        .from(videoCodesTable),
    ]);

    const statusMap = byStatus.reduce(
      (acc, curr) => {
        acc[curr.status] = Number(curr.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: Number(total[0]?.value || 0),
      active: statusMap["active"] || 0,
      pending: statusMap["pending"] || 0,
      views: Number(totalViews[0]?.views || 0),
      byChannel: byChannel
        .filter((c) => c.channelId !== null)
        .map((c) => ({
          channelId: c.channelId!,
          count: Number(c.count),
        })),
    };
  }

  // ==================== Real-time ====================

  async getRealTimeStats(): Promise<{
    activeUsers: number;
    currentViews: number;
    recentEvents: number;
    timestamp: Date;
  }> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const [activeUsers, currentViews, recentEvents] = await Promise.all([
      db
        .select({ value: count() })
        .from(watchSessionsTable)
        .where(gte(watchSessionsTable.createdAt, fiveMinutesAgo)),
      db
        .select({ value: count() })
        .from(watchSessionsTable)
        .where(
          and(
            gte(watchSessionsTable.createdAt, fiveMinutesAgo),
            sql`${watchSessionsTable.completedAt} IS NULL`,
          ),
        ),
      db
        .select({ value: count() })
        .from(watchSessionsTable)
        .where(gte(watchSessionsTable.createdAt, fiveMinutesAgo)),
    ]);

    return {
      activeUsers: Number(activeUsers[0]?.value || 0),
      currentViews: Number(currentViews[0]?.value || 0),
      recentEvents: Number(recentEvents[0]?.value || 0),
      timestamp: now,
    };
  }

  // ==================== Private Helpers ====================

  private async getTotalUsers(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(usersTable);
    return Number(result?.value || 0);
  }

  private async getActiveUsers(): Promise<number> {
    const [result] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(eq(usersTable.isActive, true));
    return Number(result?.value || 0);
  }

  private async getNewUsers(dateRange: DateRange): Promise<{
    today: number;
    thisWeek: number;
    thisMonth: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(today);
    monthStart.setMonth(monthStart.getMonth() - 1);

    const [todayCount, weekCount, monthCount] = await Promise.all([
      db
        .select({ value: count() })
        .from(usersTable)
        .where(gte(usersTable.createdAt, today)),
      db
        .select({ value: count() })
        .from(usersTable)
        .where(gte(usersTable.createdAt, weekStart)),
      db
        .select({ value: count() })
        .from(usersTable)
        .where(gte(usersTable.createdAt, monthStart)),
    ]);

    return {
      today: Number(todayCount[0]?.value || 0),
      thisWeek: Number(weekCount[0]?.value || 0),
      thisMonth: Number(monthCount[0]?.value || 0),
    };
  }

  private async getTotalMovies(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(moviesTable);
    return Number(result?.value || 0);
  }

  private async getTotalSeries(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(seriesTable);
    return Number(result?.value || 0);
  }

  private async getTotalEpisodes(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(episodesTable);
    return Number(result?.value || 0);
  }

  private async getActiveSubscriptions(): Promise<number> {
    const [result] = await db
      .select({ value: count() })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.status, "active"));
    return Number(result?.value || 0);
  }

  private async getTotalRevenue(): Promise<number> {
    const [result] = await db
      .select({ value: sql<number>`SUM(${paymentsTable.amount})` })
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "completed"));
    return Number(result?.value || 0);
  }

  private async getMonthlyRevenue(): Promise<number> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ value: sql<number>`SUM(${paymentsTable.amount})` })
      .from(paymentsTable)
      .where(
        and(
          gte(paymentsTable.createdAt, monthStart),
          eq(paymentsTable.status, "completed"),
        ),
      );
    return Number(result?.value || 0);
  }

  private async getDailyRevenue(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ value: sql<number>`SUM(${paymentsTable.amount})` })
      .from(paymentsTable)
      .where(
        and(
          gte(paymentsTable.createdAt, today),
          eq(paymentsTable.status, "completed"),
        ),
      );
    return Number(result?.value || 0);
  }

  private async getWatchSessionsToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ value: count() })
      .from(watchSessionsTable)
      .where(gte(watchSessionsTable.createdAt, today));
    return Number(result?.value || 0);
  }

  private async getWatchSessionsWeek(): Promise<number> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ value: count() })
      .from(watchSessionsTable)
      .where(gte(watchSessionsTable.createdAt, weekStart));
    return Number(result?.value || 0);
  }

  private async getTotalWatchMinutes(): Promise<number> {
    const [result] = await db
      .select({
        value: sql<number>`SUM(${watchSessionsTable.durationWatched})`,
      })
      .from(watchSessionsTable);
    return Number(result?.value || 0);
  }

  private async getAverageWatchTime(): Promise<number> {
    const [result] = await db
      .select({
        value: sql<number>`AVG(${watchSessionsTable.durationWatched})`,
      })
      .from(watchSessionsTable);
    return Number(result?.value || 0);
  }

  private async getTotalVideoCodes(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(videoCodesTable);
    const total = Number(result?.value || 0);
    this.logger.debug("Total video codes", { count: total });
    return total;
  }

  private async getActiveVideoCodes(): Promise<number> {
    const [result] = await db
      .select({ value: count() })
      .from(videoCodesTable)
      .where(eq(videoCodesTable.status, "active"));
    const total = Number(result?.value || 0);
    this.logger.debug("Active video codes", { count: total });
    return total;
  }

  private async getTotalCodeViews(): Promise<number> {
    const [result] = await db
      .select({ value: sql<number>`SUM(${videoCodesTable.viewsCount})` })
      .from(videoCodesTable);
    const views = Number(result?.value || 0);
    this.logger.debug("Total code views", { views });
    return views;
  }

  private async calculateRetentionRate(dateRange: DateRange): Promise<number> {
    // Users who signed up in the period and are still active
    const [result] = await db
      .select({
        retained: sql<number>`COUNT(DISTINCT CASE WHEN ${usersTable.isActive} = true THEN ${usersTable.id} END)`,
        total: sql<number>`COUNT(DISTINCT ${usersTable.id})`,
      })
      .from(usersTable)
      .where(
        and(
          gte(usersTable.createdAt, dateRange.start),
          lte(usersTable.createdAt, dateRange.end),
        ),
      );

    return result && Number(result.total) > 0
      ? (Number(result.retained) / Number(result.total)) * 100
      : 0;
  }

  private async calculateChurnRate(dateRange: DateRange): Promise<number> {
    // Users who were active at start but not at end
    const [result] = await db
      .select({
        churned: sql<number>`COUNT(DISTINCT CASE WHEN ${usersTable.isActive} = false THEN ${usersTable.id} END)`,
        total: sql<number>`COUNT(DISTINCT ${usersTable.id})`,
      })
      .from(usersTable)
      .where(
        and(
          gte(usersTable.createdAt, dateRange.start),
          lte(usersTable.createdAt, dateRange.end),
        ),
      );

    return result && Number(result.total) > 0
      ? (Number(result.churned) / Number(result.total)) * 100
      : 0;
  }

  private calculateEngagementScore(item: any): number {
    const viewWeight = 0.3;
    const uniqueViewerWeight = 0.2;
    const watchTimeWeight = 0.2;
    const completionWeight = 0.15;
    const ratingWeight = 0.15;

    const normalizedViews = Math.min(Number(item.viewCount) / 1000, 1);
    const normalizedUnique = Math.min(Number(item.uniqueViewers) / 500, 1);
    const normalizedWatchTime = Math.min(
      Number(item.totalWatchTime || 0) / 3600,
      1,
    );
    const normalizedCompletion = Number(item.completionRate || 0) / 100;
    const normalizedRating = Number(item.rating || 0) / 5;

    return (
      (normalizedViews * viewWeight +
        normalizedUnique * uniqueViewerWeight +
        normalizedWatchTime * watchTimeWeight +
        normalizedCompletion * completionWeight +
        normalizedRating * ratingWeight) *
      100
    );
  }
}
