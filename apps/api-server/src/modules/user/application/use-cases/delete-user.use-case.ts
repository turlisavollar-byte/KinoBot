// modules/user/application/use-cases/delete-user.use-case.ts

import { inject, injectable } from "tsyringe";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import type { UserCacheService } from "../services/user-cache.service";
import type { UserEventService } from "../services/user-event.service";
import { UserDeletedEvent } from "../../domain/events/user-deleted.event";
import { Logger } from "@/shared/utils/logger";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";

@injectable()
export class DeleteUserUseCase {
  private readonly logger = Logger.getInstance("DeleteUserUseCase");

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
    soft: boolean = true,
  ): Promise<void> {
    const startTime = Date.now();

    // Prevent self-deletion
    if (id === actorId) {
      throw new AppError(
        "Cannot delete your own account",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    // Get user
    const user = await this.repository.findById(id);
    if (!user) {
      throw new AppError(
        `User with id ${id} not found`,
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    const actor = await this.repository.findById(actorId);
    if (!actor || !actor.canManage(user)) {
      throw new AppError(
        "Cannot delete an equal or higher role",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    // Check if already deleted
    if (user.isDeleted) {
      throw new AppError(
        `User with id ${id} is already deleted`,
        409,
        ErrorCodes.CONFLICT,
      );
    }

    // Delete user
    const deletedUser = await this.repository.delete(id, soft);
    if (!deletedUser) {
      throw new AppError(
        "Failed to delete user",
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
      );
    }

    // Invalidate cache
    await this.cache.invalidate(id);

    // Emit event
    const event = new UserDeletedEvent(id, soft, actorId);
    await this.eventService.emit(event.eventName, {
      userId: id,
      actorId,
      data: event.toJSON(),
    });

    const duration = Date.now() - startTime;
    this.logger.info(`User ${soft ? "soft" : "permanently"} deleted`, {
      id,
      actorId,
      soft,
      duration: `${duration}ms`,
    });
  }
}
