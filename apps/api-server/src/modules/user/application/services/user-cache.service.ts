// modules/user/application/services/user-cache.service.ts

import { inject, injectable } from "tsyringe";
import { User } from "../../domain/entities/user.entity";
import { Logger } from "@/shared/utils/logger";
import { RedisUserCache } from "../../infrastructure/cache/redis-user-cache";
import { Email } from "../../domain/value-objects/email.vo";
import { Phone } from "../../domain/value-objects/phone.vo";
import {
  UserRoleVO,
  UserStatusVO,
} from "../../domain/value-objects/user-status.vo";

@injectable()
export class UserCacheService {
  private readonly logger = Logger.getInstance("UserCacheService");
  private readonly defaultTTL = 300; // 5 minutes

  constructor(
    @inject("RedisUserCache") private readonly redisCache: RedisUserCache,
  ) {}

  async get(id: string): Promise<User | null> {
    try {
      const data = await this.redisCache.get<any>(`user:${id}`);
      if (data) {
        return User.reconstitute({
          ...data,
          email: data.email
            ? Email.create(data.email.value ?? data.email)
            : undefined,
          phone: data.phone
            ? Phone.create(data.phone.value ?? data.phone)
            : undefined,
          status: UserStatusVO.fromString(data.status.value ?? data.status),
          role: UserRoleVO.fromString(data.role.value ?? data.role),
          lastLoginAt: data.lastLoginAt
            ? new Date(data.lastLoginAt)
            : undefined,
          weeklyCodeResetAt: data.weeklyCodeResetAt
            ? new Date(data.weeklyCodeResetAt)
            : undefined,
          monthlyCodeResetAt: data.monthlyCodeResetAt
            ? new Date(data.monthlyCodeResetAt)
            : undefined,
          trialExpiresAt: data.trialExpiresAt
            ? new Date(data.trialExpiresAt)
            : undefined,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          deletedAt: data.deletedAt ? new Date(data.deletedAt) : undefined,
        });
      }
      return null;
    } catch (error) {
      this.logger.warn("Cache get failed", { id, error });
      return null;
    }
  }

  async set(
    id: string,
    user: User,
    ttl: number = this.defaultTTL,
  ): Promise<void> {
    try {
      await this.redisCache.set(`user:${id}`, user.toJSON(), ttl);
    } catch (error) {
      this.logger.warn("Cache set failed", { id, error });
    }
  }

  async invalidate(id: string): Promise<void> {
    try {
      await this.redisCache.delete(`user:${id}`);
      this.logger.debug("Cache invalidated", { id });
    } catch (error) {
      this.logger.warn("Cache invalidation failed", { id, error });
    }
  }

  async invalidateMany(ids: string[]): Promise<void> {
    try {
      await Promise.all(ids.map((id) => this.redisCache.delete(`user:${id}`)));
      this.logger.debug("Cache invalidated for multiple users", {
        count: ids.length,
      });
    } catch (error) {
      this.logger.warn("Cache invalidation failed", { ids, error });
    }
  }

  async invalidateAll(): Promise<void> {
    try {
      await this.redisCache.invalidateAllUsers();
      this.logger.info("All user cache invalidated");
    } catch (error) {
      this.logger.warn("Cache invalidation failed", { error });
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    try {
      await this.redisCache.invalidateUser(userId);
      this.logger.info("User cache invalidated", { userId });
    } catch (error) {
      this.logger.warn("User cache invalidation failed", { userId, error });
    }
  }

  generateKey(id: string): string {
    return `user:${id}`;
  }
}
