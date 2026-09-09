// modules/user/application/use-cases/create-user.use-case.ts

import { inject, injectable } from "tsyringe";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import type { IUserProvisioningRepository } from "../../domain/repositories/user-provisioning.repository.interface";
import { User } from "../../domain/entities/user.entity";
import { UserProfile } from "../../domain/entities/user-profile.entity";
import { UserStats } from "../../domain/entities/user-stats.entity";
import { UserCreatedEvent } from "../../domain/events/user-created.event";
import type { UserEventService } from "../services/user-event.service";
import {
  UserStatusVO,
  UserRoleVO,
} from "../../domain/value-objects/user-status.vo";
import { Email } from "../../domain/value-objects/email.vo";
import { Phone } from "../../domain/value-objects/phone.vo";
import { Logger } from "@/shared/utils/logger";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";

export interface CreateUserInput {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  email?: string;
  phone?: string;
  role?: string;
  avatar?: string;
}

@injectable()
export class CreateUserUseCase {
  private readonly logger = Logger.getInstance("CreateUserUseCase");

  constructor(
    @inject("IUserRepository")
    private readonly repository: IUserRepository,
    @inject("IUserProvisioningRepository")
    private readonly provisioningRepository: IUserProvisioningRepository,
    @inject("UserEventService")
    private readonly eventService: UserEventService,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    const startTime = Date.now();

    // Check if user already exists
    const existing = await this.repository.findByTelegramId(input.telegramId);
    if (existing) {
      throw new AppError(
        `User with telegramId ${input.telegramId} already exists`,
        409,
        ErrorCodes.CONFLICT,
      );
    }

    if (input.email) {
      const existingEmail = await this.repository.findByEmail(input.email);
      if (existingEmail) {
        throw new AppError(
          `User with email ${input.email} already exists`,
          409,
          ErrorCodes.CONFLICT,
        );
      }
    }

    // Create user entity
    const user = User.createWithDefaults({
      telegramId: input.telegramId,
      email: input.email ? Email.create(input.email) : undefined,
      phone: input.phone ? Phone.create(input.phone) : undefined,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      languageCode: input.languageCode || "en",
      role: input.role
        ? UserRoleVO.fromString(input.role)
        : UserRoleVO.fromString("user"),
    });

    // Create profile
    const profile = UserProfile.create({
      userId: user.id,
      displayName:
        input.username ||
        `${input.firstName || ""} ${input.lastName || ""}`.trim() ||
        "User",
      avatar: input.avatar,
    });
    // Create stats
    const stats = UserStats.create({
      userId: user.id,
      totalWatchTime: 0,
      totalWatchSessions: 0,
      totalMoviesWatched: 0,
      totalSeriesWatched: 0,
      totalEpisodesWatched: 0,
      totalFavorites: 0,
      totalRatings: 0,
      averageRating: 0,
      activeStreak: 0,
      longestStreak: 0,
      totalSubscriptions: 0,
      activeSubscriptionCount: 0,
      totalReferrals: 0,
      referralRewards: 0,
    });
    const createdUser = await this.provisioningRepository.createUserAggregate(
      user,
      profile,
      stats,
    );

    // Emit event
    const event = new UserCreatedEvent(createdUser);
    await this.eventService.emit(event.eventName, {
      userId: createdUser.id,
      data: event.toJSON(),
    });

    const duration = Date.now() - startTime;
    this.logger.info("User created", {
      id: createdUser.id,
      telegramId: createdUser.telegramId,
      duration: `${duration}ms`,
    });

    return createdUser;
  }
}
