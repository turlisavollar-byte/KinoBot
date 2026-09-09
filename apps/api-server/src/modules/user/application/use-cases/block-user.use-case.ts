// modules/user/application/use-cases/block-user.use-case.ts

import { inject, injectable } from "tsyringe";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import type { UserCacheService } from "../services/user-cache.service";
import type { UserEventService } from "../services/user-event.service";
import { User } from "../../domain/entities/user.entity";
import { UserBlockedEvent } from "../../domain/events/user-blocked.event";
import { Logger } from "@/shared/utils/logger";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";
import { canManage, normalizeRoleName } from "@/shared/constants/roles";

@injectable()
export class BlockUserUseCase {
  private readonly logger = Logger.getInstance("BlockUserUseCase");

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
    actorId: string,
    blocked: boolean,
    reason?: string,
    actorRole?: string,
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

    // Prevent blocking self
    if (id === actorId) {
      throw new AppError("Cannot block yourself", 403, ErrorCodes.FORBIDDEN);
    }

    const actor = actorRole
      ? undefined
      : await this.repository.findById(actorId);
    const actorCanManage = actorRole
      ? canManage(
          normalizeRoleName(actorRole),
          normalizeRoleName(user.role.value),
        )
      : Boolean(actor?.canManage(user));
    if (!actorCanManage) {
      throw new AppError(
        "Cannot block or unblock an equal or higher role",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    if (user.isBlocked === blocked) {
      return user;
    }

    // Execute block/unblock
    if (blocked) {
      user.block(reason);
    } else {
      user.unblock();
    }

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
    const event = new UserBlockedEvent(id, blocked, reason, actorId);
    await this.eventService.emit(event.eventName, {
      userId: id,
      actorId,
      data: event.toJSON(),
    });

    const duration = Date.now() - startTime;
    this.logger.info(`User ${blocked ? "blocked" : "unblocked"}`, {
      id,
      actorId,
      duration: `${duration}ms`,
    });

    return updatedUser;
  }
}
