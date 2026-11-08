import { inject, injectable } from "tsyringe";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import { User } from "../../domain/entities/user.entity";
import { AppError } from "@/shared/errors/AppError";
import { logAuditEvent } from "@/shared/utils/audit";

const DAY_MS = 24 * 60 * 60 * 1000;

@injectable()
export class ExtendTrialUseCase {
  constructor(
    @inject("IUserRepository")
    private readonly repository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    days: number,
    actorId: string,
  ): Promise<User> {
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw AppError.validation("Trial extension must be between 1 and 365 days");
    }

    const user = await this.repository.findById(userId);
    if (!user) throw AppError.notFound("User", userId);

    const now = new Date();
    const currentExpiry = user.trialExpiresAt;
    const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + days * DAY_MS);
    const updatedUser = User.reconstitute({
      ...user.toJSON(),
      trialExpiresAt: newExpiry,
      updatedAt: now,
    });
    const savedUser = await this.repository.update(updatedUser);

    await logAuditEvent({
      action: "TRIAL_EXTENDED",
      targetType: "USER",
      targetId: userId,
      actorId,
      actorType: "ADMIN",
      oldValue: { trialExpiresAt: currentExpiry?.toISOString() ?? null },
      newValue: { trialExpiresAt: newExpiry.toISOString(), daysAdded: days },
    });

    return savedUser;
  }
}