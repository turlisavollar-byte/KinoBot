import { describe, expect, it, vi } from "vitest";
import { ListUsersUseCase } from "./list-users.use-case";

describe("ListUsersUseCase role scope", () => {
  it.each([
    ["superadmin", {}],
    ["admin", { roles: ["user", "moderator", "manager"], includeId: "actor-1" }],
    ["moderator", { roles: ["user"], includeId: "actor-1" }],
    ["user", { includeId: "actor-1", selfOnly: true }],
    ["manager", { roles: ["user"], includeId: "actor-1" }],
    ["viewer", { includeId: "actor-1", selfOnly: true }],
  ])("passes the %s scope to the repository", async (role, accessScope) => {
    const repository = {
      findMany: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
    };
    const useCase = new ListUsersUseCase(repository as any);

    await useCase.execute({ page: 1, limit: 20 }, { id: "actor-1", role });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ accessScope }),
    );
  });
});