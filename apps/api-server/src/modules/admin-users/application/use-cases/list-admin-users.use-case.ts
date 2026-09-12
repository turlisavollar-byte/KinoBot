import type {
  AdminUserListOptions,
  AdminUsersRepository,
} from "../../infrastructure/repositories/admin-users.repository";

export class ListAdminUsersUseCase {
  constructor(private readonly repository: AdminUsersRepository) {}

  execute(options: AdminUserListOptions) {
    return this.repository.list(options);
  }
}
