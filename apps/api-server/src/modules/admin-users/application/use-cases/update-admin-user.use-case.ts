import { normalizeRoleName, type Role } from "@/shared/constants/roles";
import { canManageAdminAccount } from "@/shared/constants/user-access";
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
    if (!target) {
      throw new AppError(
        "Admin account not found",
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    const actorRole = normalizeRoleName(command.actorRole) as Role;
    const currentRole = normalizeRoleName(target.role) as Role;
    const isSelf = command.actorId === command.targetId;
    if (
      (!isSelf &&
        !canManageAdminAccount(
          command.actorId,
          command.actorRole,
          command.targetId,
          currentRole,
        )) ||
      (isSelf && command.role !== undefined)
    ) {
      throw new AppError(
        isSelf
          ? "Cannot change your own administrative role"
          : "Cannot edit an administrative account outside your scope",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    const nextRole = command.role
      ? (normalizeRoleName(command.role) as Role)
      : currentRole;
    if (
      command.role &&
      (isSelf ||
        !canManageAdminAccount(
          command.actorId,
          actorRole,
          command.targetId,
          nextRole,
        ))
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
