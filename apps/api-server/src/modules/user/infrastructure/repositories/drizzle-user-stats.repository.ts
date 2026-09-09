// modules/user/infrastructure/repositories/drizzle-user-stats.repository.ts

import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { db, userStatsTable } from '@workspace/db';
import { IUserStatsRepository } from '../../domain/repositories/user-stats.repository.interface';
import { UserStats } from '../../domain/entities/user-stats.entity';
import { Logger } from '@/shared/utils/logger';

type DbUserStats = typeof userStatsTable.$inferSelect;

@injectable()
export class DrizzleUserStatsRepository implements IUserStatsRepository {
  private readonly logger = Logger.getInstance('DrizzleUserStatsRepository');

  private toDomain(row: DbUserStats): UserStats {
    return UserStats.reconstitute({
      userId: row.userId,
      totalWatchTime: row.totalWatchTime || 0,
      totalWatchSessions: row.totalWatchSessions || 0,
      totalMoviesWatched: row.totalMoviesWatched || 0,
      totalSeriesWatched: row.totalSeriesWatched || 0,
      totalEpisodesWatched: row.totalEpisodesWatched || 0,
      totalFavorites: row.totalFavorites || 0,
      totalRatings: row.totalRatings || 0,
      averageRating: row.averageRating || 0,
      lastWatchDate: row.lastWatchDate || undefined,
      activeStreak: row.activeStreak || 0,
      longestStreak: row.longestStreak || 0,
      totalSubscriptions: row.totalSubscriptions || 0,
      activeSubscriptionCount: row.activeSubscriptionCount || 0,
      totalReferrals: row.totalReferrals || 0,
      referralRewards: row.referralRewards || 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt || row.createdAt,
    });
  }

  private toDb(stats: UserStats): Omit<DbUserStats, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      userId: stats.userId,
      totalWatchTime: stats.totalWatchTime,
      totalWatchSessions: stats.totalWatchSessions,
      totalMoviesWatched: stats.totalMoviesWatched,
      totalSeriesWatched: stats.totalSeriesWatched,
      totalEpisodesWatched: stats.totalEpisodesWatched,
      totalFavorites: stats.totalFavorites,
      totalRatings: stats.totalRatings,
      averageRating: stats.averageRating,
      lastWatchDate: stats.lastWatchDate || null,
      activeStreak: stats.activeStreak,
      longestStreak: stats.longestStreak,
      totalSubscriptions: stats.totalSubscriptions,
      activeSubscriptionCount: stats.activeSubscriptionCount,
      totalReferrals: stats.totalReferrals,
      referralRewards: stats.referralRewards,
    };
  }

  async findById(id: string): Promise<UserStats | null> {
    const [row] = await db
      .select()
      .from(userStatsTable)
      .where(eq(userStatsTable.id, id))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<UserStats | null> {
    const [row] = await db
      .select()
      .from(userStatsTable)
      .where(eq(userStatsTable.userId, userId))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async create(stats: UserStats): Promise<UserStats> {
    const [row] = await db
      .insert(userStatsTable)
      .values(this.toDb(stats))
      .returning();

    if (!row) {
      throw new Error('Failed to create user stats');
    }

    return this.toDomain(row);
  }

  async update(stats: UserStats): Promise<UserStats> {
    const { userId, ...updateData } = this.toDb(stats);

    const [row] = await db
      .update(userStatsTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(userStatsTable.userId, stats.userId))
      .returning();

    if (!row) {
      throw new Error(`Failed to update user stats for userId ${stats.userId}`);
    }

    return this.toDomain(row);
  }

  async delete(id: string): Promise<UserStats | null> {
    const stats = await this.findById(id);
    if (!stats) {
      return null;
    }

    const [row] = await db
      .delete(userStatsTable)
      .where(eq(userStatsTable.id, id))
      .returning();

    return row ? this.toDomain(row) : null;
  }

  async exists(id: string): Promise<boolean> {
    const [row] = await db
      .select({ id: userStatsTable.id })
      .from(userStatsTable)
      .where(eq(userStatsTable.id, id))
      .limit(1);

    return !!row;
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ userId: userStatsTable.userId })
      .from(userStatsTable)
      .where(eq(userStatsTable.userId, userId))
      .limit(1);

    return !!row;
  }

  async incrementWatchTime(userId: string, duration: number, contentType: 'movie' | 'series' | 'episode'): Promise<UserStats> {
    const stats = await this.findByUserId(userId);
    if (!stats) {
      throw new Error(`User stats not found for userId ${userId}`);
    }

    stats.recordWatch(duration, contentType);
    return this.update(stats);
  }

  async addRating(userId: string, rating: number): Promise<UserStats> {
    const stats = await this.findByUserId(userId);
    if (!stats) {
      throw new Error(`User stats not found for userId ${userId}`);
    }

    stats.addRating(rating);
    return this.update(stats);
  }

  async addFavorite(userId: string): Promise<UserStats> {
    const stats = await this.findByUserId(userId);
    if (!stats) {
      throw new Error(`User stats not found for userId ${userId}`);
    }

    stats.addFavorite();
    return this.update(stats);
  }

  async removeFavorite(userId: string): Promise<UserStats> {
    const stats = await this.findByUserId(userId);
    if (!stats) {
      throw new Error(`User stats not found for userId ${userId}`);
    }

    stats.removeFavorite();
    return this.update(stats);
  }

  async addSubscription(userId: string): Promise<UserStats> {
    const stats = await this.findByUserId(userId);
    if (!stats) {
      throw new Error(`User stats not found for userId ${userId}`);
    }

    stats.addSubscription();
    return this.update(stats);
  }

  async removeSubscription(userId: string): Promise<UserStats> {
    const stats = await this.findByUserId(userId);
    if (!stats) {
      throw new Error(`User stats not found for userId ${userId}`);
    }

    stats.removeSubscription();
    return this.update(stats);
  }

  async addReferral(userId: string): Promise<UserStats> {
    const stats = await this.findByUserId(userId);
    if (!stats) {
      throw new Error(`User stats not found for userId ${userId}`);
    }

    stats.addReferral();
    return this.update(stats);
  }
}
