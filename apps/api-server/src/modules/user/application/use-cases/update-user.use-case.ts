// modules/user/application/use-cases/update-user.use-case.ts

import { inject, injectable } from "tsyringe";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import type { UserCacheService } from "../services/user-cache.service";
import type { UserEventService } from "../services/user-event.service";
import { User } from "../../domain/entities/user.entity";
import {
  UserStatusVO,
  UserRoleVO,
} from "../../domain/value-objects/user-status.vo";
import { UserUpdatedEvent } from "../../domain/events/user-updated.event";
import { Logger } from "@/shared/utils/logger";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";
import { canManage, normalizeRoleName } from "@/shared/constants/roles";

export interface UpdateUserInput {
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  isActive?: boolean;
  status?: string;
  dailyCodeLimit?: number | null;
  referralRewardTier?: number;
  accountStatus?: "active" | "blocked";
  weeklyCodeLimit?: number | null;
  monthlyCodeLimit?: number | null;
  actorRole?: string;
}

@injectable()
export class UpdateUserUseCase {
  private readonly logger = Logger.getInstance("UpdateUserUseCase");

  constructor(
    @inject("IUserRepository")
    private readonly repository: IUserRepository,
    @inject("UserCacheService")
    private readonly cache: UserCacheService,
    @inject("UserEventService")
    private readonly eventService: UserEventService,
  ) {}

  async execute(
    id: string,
    input: UpdateUserInput,
    actorId?: string,
  ): Promise<User> {
    const startTime = Date.now();

    // Get user
    const user = await this.repository.findById(id);
    if (!user) {
      throw new AppError(
        `User with id ${id} not found`,
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    if (actorId && actorId !== id) {
      const actor = input.actorRole
        ? undefined
        : await this.repository.findById(actorId);
      const actorCanManage = input.actorRole
        ? canManage(
            normalizeRoleName(input.actorRole),
            normalizeRoleName(user.role.value),
          )
        : Boolean(actor?.canManage(user));
      if (!actorCanManage) {
        throw new AppError(
          "Cannot update an equal or higher role",
          403,
          ErrorCodes.FORBIDDEN,
        );
      }
    }

    // Store old state for audit
    const oldState = user.toJSON();

    // Update user
    if (input.username !== undefined) {
      // Check if username is taken
      // In real implementation, you'd check for duplicate username
      user.updateProfile({ username: input.username });
    }

    if (
      input.firstName !== undefined ||
      input.lastName !== undefined ||
      input.languageCode !== undefined
    ) {
      user.updateProfile({
        firstName: input.firstName,
        lastName: input.lastName,
        languageCode: input.languageCode,
      });
    }

    if (input.accountStatus !== undefined) {
      if (input.accountStatus === "blocked") {
        user.block();
      } else {
        user.unblock();
      }
    } else if (input.isActive !== undefined) {
      if (input.isActive) {
        user.activate();
      } else {
        user.deactivate();
      }
    }

    if (input.status !== undefined) {
      // Validate status transition
      this.validateStatusTransition(user.status.toString(), input.status);
      user.changeStatus(input.status);
    }

    if (
      input.dailyCodeLimit !== undefined ||
      input.referralRewardTier !== undefined ||
      input.weeklyCodeLimit !== undefined ||
      input.monthlyCodeLimit !== undefined
    ) {
      user.updateAccessRules({
        dailyCodeLimit: input.dailyCodeLimit,
        referralRewardTier: input.referralRewardTier,
        weeklyCodeLimit: input.weeklyCodeLimit,
        monthlyCodeLimit: input.monthlyCodeLimit,
      });
    }

    // Save changes
    const updatedUser = await this.repository.update(user);
    if (!updatedUser) {
      throw new AppError(
        "Failed to update user",
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }

    // Invalidate cache
    await this.cache.invalidate(id);

    // Emit event
    const event = new UserUpdatedEvent(
      updatedUser,
      input as Record<string, unknown>,
      actorId,
    );
    await this.eventService.emit(event.eventName, {
      userId: id,
      actorId,
      data: event.toJSON(),
    });

    const duration = Date.now() - startTime;
    this.logger.info("User updated", {
      id,
      actorId,
      duration: `${duration}ms`,
    });

    return updatedUser;
  }

  private validateStatusTransition(current: string, newStatus: string): void {
    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      active: ["inactive", "blocked", "deleted", "suspended"],
      inactive: ["active", "deleted"],
      blocked: ["active", "deleted"],
      deleted: [],
      suspended: ["active", "deleted"],
    };

    if (!validTransitions[current]?.includes(newStatus)) {
      throw new AppError(
        `Cannot transition from ${current} to ${newStatus}`,
        400,
        ErrorCodes.VALIDATION_ERROR,
      );
    }
  }
}
