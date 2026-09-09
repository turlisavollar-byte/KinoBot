import { describe, expect, it, vi } from "vitest";
import { AssignRoleUseCase } from "./assign-role.use-case";

function createRepository() {
  return {
    findById: vi.fn().mockResolvedValue({ role: { name: "admin" } }),
    update: vi.fn(),
  } as any;
}

describe("AssignRoleUseCase", () => {
  it("rejects role assignment to an equal or higher role", async () => {
    const repository = createRepository();
    const sessionRepository = { revokeAll: vi.fn() } as any;
    const useCase = new AssignRoleUseCase(repository, sessionRepository);

    await expect(
      useCase.execute("actor-id", "superadmin", "target-id", "superadmin"),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("rejects role assignment by a non-superadmin actor", async () => {
    const repository = createRepository();
    const sessionRepository = { revokeAll: vi.fn() } as any;
    const useCase = new AssignRoleUseCase(repository, sessionRepository);

    await expect(
      useCase.execute("actor-id", "admin", "target-id", "user"),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.findById).not.toHaveBeenCalled();
  });
});
