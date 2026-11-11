import { describe, expect, it, vi } from "vitest";
import { ListAdminUsersUseCase } from "./list-admin-users.use-case";

describe("ListAdminUsersUseCase scope", () => {
  it("passes the admin self and moderator scope to the repository", async () => {
    const repository = { list: vi.fn().mockResolvedValue({ users: [], total: 0 }) };
    const useCase = new ListAdminUsersUseCase(repository as any);

    await useCase.execute(
      { page: 1, pageSize: 25 },
      { id: "admin-1", role: "admin" },
    );

    expect(repository.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      scope: { roles: ["moderator", "manager"], includeId: "admin-1" },
    });
  });

  it("denies moderators from listing admin accounts even if a permission is misconfigured", async () => {
    const repository = { list: vi.fn() };
    const useCase = new ListAdminUsersUseCase(repository as any);

    await expect(
      useCase.execute(
        { page: 1, pageSize: 25 },
        { id: "mod-1", role: "moderator" },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.list).not.toHaveBeenCalled();
  });
});