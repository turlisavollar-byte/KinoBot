import { injectable } from "tsyringe";
import {
  db,
  usersTable,
  userProfilesTable,
  userStatsTable,
} from "@workspace/db";
import type { IUserProvisioningRepository } from "../../domain/repositories/user-provisioning.repository.interface";
import { User } from "../../domain/entities/user.entity";
import { UserProfile } from "../../domain/entities/user-profile.entity";
import { UserStats } from "../../domain/entities/user-stats.entity";

@injectable()
export class DrizzleUserProvisioningRepository implements IUserProvisioningRepository {
  async createUserAggregate(
    user: User,
    profile: UserProfile,
    stats: UserStats,
  ): Promise<User> {
    const statsData = stats.toJSON();

    await db.transaction(async (tx) => {
      await tx.insert(usersTable).values({
        id: user.id,
        telegramId: user.telegramId,
        email: user.email?.toString(),
        phone: user.phone?.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        languageCode: user.languageCode,
        status: user.status.toString(),
        role: user.role.toString(),
        isActive: user.isActive,
        isBlocked: user.isBlocked,
        blockedReason: user.blockedReason,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

      await tx.insert(userProfilesTable).values({
        userId: profile.userId,
        displayName: profile.displayName,
        bio: profile.bio,
        avatar: profile.avatar,
        coverImage: profile.coverImage,
        location: profile.location,
        website: profile.website,
        birthDate: profile.birthDate,
        gender: profile.gender,
        preferences: profile.preferences,
        metadata: profile.metadata,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      });

      await tx.insert(userStatsTable).values({
        userId: stats.userId,
        totalWatchTime: stats.totalWatchTime,
        totalWatchSessions: stats.totalWatchSessions,
        totalMoviesWatched: stats.totalMoviesWatched,
        totalSeriesWatched: stats.totalSeriesWatched,
        totalEpisodesWatched: stats.totalEpisodesWatched,
        totalFavorites: stats.totalFavorites,
        totalRatings: stats.totalRatings,
        averageRating: stats.averageRating,
        lastWatchDate: stats.lastWatchDate,
        activeStreak: stats.activeStreak,
        longestStreak: stats.longestStreak,
        totalSubscriptions: stats.totalSubscriptions,
        activeSubscriptionCount: stats.activeSubscriptionCount,
        totalReferrals: stats.totalReferrals,
        referralRewards: stats.referralRewards,
        createdAt: statsData.createdAt,
        updatedAt: statsData.updatedAt,
      });
    });

    return user;
  }
}
