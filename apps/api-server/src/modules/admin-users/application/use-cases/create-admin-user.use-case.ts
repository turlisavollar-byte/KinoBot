import { normalizeRoleName } from "@/shared/constants/roles";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";
import { auditService } from "@/modules/audit/audit.service";
import { PasswordService } from "@/modules/identity/infrastructure/services/password.service";
import type { AdminUsersRepository } from "../../infrastructure/repositories/admin-users.repository";

export interface CreateAdminUserInput {
  actorId: string;
  actorRole: string;
  email: string;
  role: string;
  password: string;
}

export class CreateAdminUserUseCase {
  constructor(
    private readonly repository: AdminUsersRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(input: CreateAdminUserInput) {
    if (normalizeRoleName(input.actorRole) !== "superadmin") {
      throw new AppError(
        "Only a superadmin can create administrative accounts",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    const email = input.email.trim().toLowerCase();
    const role = normalizeRoleName(input.role);
    if (role !== "admin" && role !== "moderator") {
      throw new AppError(
        "New administrative accounts must use admin or moderator role",
        400,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const validation = this.passwordService.validatePasswordStrength(
      input.password,
    );
    if (!validation.isValid) {
      throw new AppError(
        validation.errors.join(". "),
        400,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    if (await this.repository.emailExists(email)) {
      throw new AppError(
        "An account with this email already exists",
        409,
        ErrorCodes.CONFLICT,
      );
    }

    const roleId = await this.repository.findRoleId(role);
    if (!roleId) {
      throw new AppError("Requested role is not configured", 400, ErrorCodes.VALIDATION_ERROR);
    }

    let created;
    try {
      created = await this.repository.createAdmin({
        email,
        role,
        roleId,
        passwordHash: await this.passwordService.hash(input.password),
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "23505") {
        throw new AppError(
          "An account with this email already exists",
          409,
          ErrorCodes.CONFLICT,
        );
      }
      throw error;
    }

    await auditService.log({
      actorId: input.actorId,
      actorType: "ADMIN",
      action: "CREATE",
      targetType: "ADMIN",
      targetId: created.id,
      targetName: created.email,
      newValue: { email: created.email, role: created.role },
      metadata: { event: "admin_account_created" },
    });

    return created;
  }
}