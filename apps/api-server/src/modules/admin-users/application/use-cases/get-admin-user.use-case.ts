import { canReadAdminAccount } from "@/shared/constants/user-access";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";
import type { AdminUsersRepository } from "../../infrastructure/repositories/admin-users.repository";

export class GetAdminUserUseCase {
  constructor(private readonly repository: AdminUsersRepository) {}

  async execute(actorId: string, actorRole: string, targetId: string) {
    const user = await this.repository.findSafeById(targetId);
    if (!user || !canReadAdminAccount(actorId, actorRole, targetId, user.role)) {
      throw new AppError("Admin account not found", 404, ErrorCodes.NOT_FOUND);
    }

    return user;
  }
}