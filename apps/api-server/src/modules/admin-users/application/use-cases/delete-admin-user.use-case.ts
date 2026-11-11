import { canManageAdminAccount } from "@/shared/constants/user-access";
import type { AdminUsersRepository } from "../../infrastructure/repositories/admin-users.repository";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";

export class DeleteAdminUserUseCase {
  constructor(private readonly repository: AdminUsersRepository) {}

  async execute(
    actorId: string,
    actorRoleName: string,
    targetId: string,
  ): Promise<void> {
    const target = await this.repository.findById(targetId);
    if (!target)
      throw new AppError("Admin account not found", 404, ErrorCodes.NOT_FOUND);
    if (actorId === targetId)
      throw new AppError(
        "Cannot delete your own admin account",
        403,
        ErrorCodes.FORBIDDEN,
      );

    if (
      !canManageAdminAccount(actorId, actorRoleName, targetId, target.role)
    ) {
      throw new AppError(
        "Cannot delete an administrative account outside your scope",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    await this.repository.softDelete(targetId);
  }
}
