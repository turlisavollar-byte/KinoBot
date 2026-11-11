import type {
  AdminUserListOptions,
  AdminUsersRepository,
} from "../../infrastructure/repositories/admin-users.repository";
import { canListAdminAccounts, getAdminAccountScope } from "@/shared/constants/user-access";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";

export class ListAdminUsersUseCase {
  constructor(private readonly repository: AdminUsersRepository) {}

  async execute(
    options: AdminUserListOptions,
    actor: { id: string; role: string },
  ) {
    if (!canListAdminAccounts(actor.role)) {
      throw new AppError(
        "You cannot list administrative accounts",
        403,
        ErrorCodes.FORBIDDEN,
      );
    }

    return this.repository.list({
      ...options,
      scope: getAdminAccountScope(actor.id, actor.role),
    });
  }
}
