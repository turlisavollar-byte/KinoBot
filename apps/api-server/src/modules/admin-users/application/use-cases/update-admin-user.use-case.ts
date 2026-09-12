import {
  RoleHierarchy,
  normalizeRoleName,
  type Role,
} from "@/shared/constants/roles";
import type { AdminUsersRepository } from "../../infrastructure/repositories/admin-users.repository";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";

export interface UpdateAdminUserCommand {
  actorId: string;
  actorRole: string;
  targetId: string;
  name?: string;
  email?: string;
  role?: string;
}

export class UpdateAdminUserUseCase {
  constructor(private readonly repository: AdminUsersRepository) {}

  async execute(command: UpdateAdminUserCommand) {
    const target = await this.repository.findById(command.targetId);
    if (!target || command.actorId === command.targetId) {
      throw new AppError(
        !target
          ? "Admin account not found"
          : "Cannot edit your own admin account",
        !target ? 404 : 403,
        !target ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      );
    }

    const actorRole = normalizeRoleName(command.actorRole) as Role;
    const currentRole = normalizeRoleName(target.role) as Role;
    if (RoleHierarchy[actorRole] <= RoleHierarchy[currentRole]) {
      throw new AppError(
        "Cannot edit an equal or higher role",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    const nextRole = command.role
      ? (normalizeRoleName(command.role) as Role)
      : currentRole;
    if (
      !(nextRole in RoleHierarchy) ||
      RoleHierarchy[actorRole] <= RoleHierarchy[nextRole]
    ) {
      throw new AppError(
        "Cannot assign an equal or higher role",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    const updateData: {
      name?: string;
      email?: string;
      role?: string;
      roleId?: string;
    } = {};
    if (command.name?.trim()) updateData.name = command.name.trim();
    if (command.email?.trim())
      updateData.email = command.email.trim().toLowerCase();

    if (command.role) {
      const roleId = await this.repository.findRoleId(nextRole);
      if (!roleId)
        throw new AppError("Invalid role", 400, ErrorCodes.VALIDATION_ERROR);
      updateData.role = nextRole;
      updateData.roleId = roleId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError(
        "No changes provided",
        400,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    return this.repository.update(command.targetId, updateData);
  }
}
