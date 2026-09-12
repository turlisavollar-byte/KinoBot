import type { Role } from "@/shared/constants/roles";
import {
  RoleHierarchy,
  Roles,
  normalizeRoleName,
} from "@/shared/constants/roles";
import { permissionCache } from "@/shared/utils/permission-cache";
import { logAudit } from "@/shared/utils/audit";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";
import type { IUserRepository } from "@/modules/identity/domain/repositories/IUserRepository";
import type { ISessionRepository } from "@/modules/identity/domain/repositories/ISessionRepository";
import type { AssignRoleResult } from "../../types/rbac.types";

export class AssignRoleUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(
    actorId: string,
    actorRole: Role,
    targetUserId: string,
    newRole: Role,
  ): Promise<AssignRoleResult> {
    const normalizedActorRole = normalizeRoleName(actorRole);
    const normalizedNewRole = normalizeRoleName(newRole);

    if (!(["superadmin", "admin"] as Role[]).includes(normalizedActorRole)) {
      throw new AppError(
        "Only admin or superadmin can assign roles",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    if (actorId === targetUserId) {
      throw new AppError(
        "Cannot change your own role",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    if (!(Object.values(Roles) as string[]).includes(normalizedNewRole)) {
      throw new AppError(
        `Invalid role: ${normalizedNewRole}`,
        400,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const target = await this.userRepo.findById(targetUserId);
    if (!target) {
      throw new AppError("User not found", 404, ErrorCodes.NOT_FOUND);
    }

    const previousRole = normalizeRoleName(target.role.name);
    if (previousRole === normalizedNewRole) {
      throw new AppError(
        `User already has role '${normalizedNewRole}'`,
        409,
        ErrorCodes.CONFLICT,
      );
    }

    if (previousRole === "superadmin" && normalizedNewRole !== "superadmin") {
      const superAdminCount = await this.userRepo.count({
        roleId: "superadmin",
      });
      if (superAdminCount <= 1) {
        throw new AppError(
          "Last super admin cannot be removed",
          409,
          ErrorCodes.CONFLICT,
        );
      }
    }

    if (
      RoleHierarchy[normalizedActorRole] <= RoleHierarchy[normalizedNewRole]
    ) {
      throw new AppError(
        "An actor cannot assign an equal or higher role",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    await this.sessionRepo.revokeAll(targetUserId);
    await this.userRepo.update(targetUserId, { role: normalizedNewRole });
    permissionCache.invalidate(targetUserId);

    await logAudit({
      action: "UPDATE",
      userId: actorId,
      targetId: targetUserId,
      targetType: "USER",
      metadata: { previousRole, newRole: normalizedNewRole },
    });

    return {
      userId: targetUserId,
      previousRole,
      newRole: normalizedNewRole,
      updatedAt: new Date(),
    };
  }
}
