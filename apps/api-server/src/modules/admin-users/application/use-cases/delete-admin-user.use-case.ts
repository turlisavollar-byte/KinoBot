import {
  RoleHierarchy,
  normalizeRoleName,
  type Role,
} from "@/shared/constants/roles";
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

    const actorRole = normalizeRoleName(actorRoleName) as Role;
    const targetRole = normalizeRoleName(target.role) as Role;
    if (RoleHierarchy[actorRole] <= RoleHierarchy[targetRole]) {
      throw new AppError(
        "Cannot delete an equal or higher role",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    await this.repository.softDelete(targetId);
  }
}
