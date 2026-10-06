import { canManageAdminAccount } from "@/shared/constants/user-access";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";
import type { AdminUsersRepository } from "../../infrastructure/repositories/admin-users.repository";

export class BanAdminUserUseCase {
  constructor(private readonly repository: AdminUsersRepository) {}

  async execute(
    actorId: string,
    actorRole: string,
    targetId: string,
    banned: boolean,
  ): Promise<void> {
    const target = await this.repository.findById(targetId);
    if (!target) {
      throw new AppError("Admin account not found", 404, ErrorCodes.NOT_FOUND);
    }
    if (
      !canManageAdminAccount(actorId, actorRole, targetId, target.role)
    ) {
      throw new AppError(
        "Cannot change status of an administrative account outside your scope",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    await this.repository.setActive(targetId, !banned);
  }
}