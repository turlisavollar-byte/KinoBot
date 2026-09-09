// modules/user/infrastructure/repositories/drizzle-user-profile.repository.ts

import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { db, userProfilesTable } from '@workspace/db';
import { IUserProfileRepository } from '../../domain/repositories/user-profile.repository.interface';
import { UserProfile } from '../../domain/entities/user-profile.entity';
import { Logger } from '@/shared/utils/logger';

type DbUserProfile = typeof userProfilesTable.$inferSelect;

@injectable()
export class DrizzleUserProfileRepository implements IUserProfileRepository {
  private readonly logger = Logger.getInstance('DrizzleUserProfileRepository');

  private toDomain(row: DbUserProfile): UserProfile {
    return UserProfile.reconstitute({
      userId: row.userId,
      displayName: row.displayName,
      bio: row.bio || undefined,
      avatar: row.avatar || undefined,
      coverImage: row.coverImage || undefined,
      location: row.location || undefined,
      website: row.website || undefined,
      birthDate: row.birthDate || undefined,
      gender: row.gender as any || undefined,
      preferences: row.preferences as Record<string, unknown> || undefined,
      metadata: row.metadata as Record<string, unknown> || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt || row.createdAt,
    });
  }

  private toDb(profile: UserProfile): Partial<DbUserProfile> {
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      bio: profile.bio,
      avatar: profile.avatar,
      coverImage: profile.coverImage,
      location: profile.location,
      website: profile.website,
      birthDate: profile.birthDate,
      gender: profile.gender as any,
      preferences: profile.preferences as any,
      metadata: profile.metadata as any,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async findById(id: string): Promise<UserProfile | null> {
    const [row] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, id))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    const [row] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async create(profile: UserProfile): Promise<UserProfile> {
    const dbData = this.toDb(profile);
    const [row] = await db
      .insert(userProfilesTable)
      .values({
        userId: dbData.userId!,
        displayName: dbData.displayName!,
        ...dbData,
      })
      .returning();

    if (!row) {
      throw new Error('Failed to create user profile');
    }

    return this.toDomain(row);
  }

  async update(profile: UserProfile): Promise<UserProfile> {
    const updateData = this.toDb(profile);
    delete updateData.userId;
    delete updateData.createdAt;

    const [row] = await db
      .update(userProfilesTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(userProfilesTable.userId, profile.userId))
      .returning();

    if (!row) {
      throw new Error(`Failed to update user profile for userId ${profile.userId}`);
    }

    return this.toDomain(row);
  }

  async delete(id: string): Promise<UserProfile | null> {
    const profile = await this.findById(id);
    if (!profile) {
      return null;
    }

    const [row] = await db
      .delete(userProfilesTable)
      .where(eq(userProfilesTable.id, id))
      .returning();

    return row ? this.toDomain(row) : null;
  }

  async exists(id: string): Promise<boolean> {
    const [row] = await db
      .select({ id: userProfilesTable.id })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, id))
      .limit(1);

    return !!row;
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ userId: userProfilesTable.userId })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId))
      .limit(1);

    return !!row;
  }
}
