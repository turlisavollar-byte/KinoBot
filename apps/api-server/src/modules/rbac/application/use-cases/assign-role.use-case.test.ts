import { describe, expect, it, vi } from "vitest";
import { AuditService } from "@/modules/audit/audit.service";
import { AssignRoleUseCase } from "./assign-role.use-case";

function createRepository(role = "admin", superAdminCount = 2) {
  return {
    findById: vi.fn().mockResolvedValue({ role: { name: role } }),
    update: vi.fn(),
    count: vi.fn().mockResolvedValue(superAdminCount),
  } as any;
}

describe("AssignRoleUseCase", () => {
  it("does not throw when audit logging is unavailable in test mode", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    try {
      const service = new AuditService();
      await expect(
        service.log({
          actorId: "actor-id",
          actorType: "SYSTEM",
          action: "UPDATE",
          targetType: "USER",
          targetId: "target-id",
          metadata: {
            previousRole: "admin",
            newRole: "user",
          },
        }),
      ).resolves.toMatchObject({
        actorId: "actor-id",
        targetId: "target-id",
      });
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it("rejects role assignment to an equal or higher role", async () => {
    const repository = createRepository();
    const sessionRepository = { revokeAll: vi.fn() } as any;
    const useCase = new AssignRoleUseCase(repository, sessionRepository);

    await expect(
      useCase.execute("actor-id", "superadmin", "target-id", "superadmin"),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("allows an admin to assign a lower role", async () => {
    const repository = createRepository();
    const sessionRepository = { revokeAll: vi.fn() } as any;
    const useCase = new AssignRoleUseCase(repository, sessionRepository);

    await expect(
      useCase.execute("actor-id", "admin", "target-id", "user"),
    ).resolves.toMatchObject({
      previousRole: "admin",
      newRole: "user",
    });
    expect(repository.update).toHaveBeenCalledWith("target-id", {
      role: "user",
    });
  });

  it("rejects demoting the last superadmin", async () => {
    const repository = createRepository("superadmin", 1);
    const sessionRepository = { revokeAll: vi.fn() } as any;
    const useCase = new AssignRoleUseCase(repository, sessionRepository);

    await expect(
      useCase.execute("actor-id", "superadmin", "target-id", "admin"),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.update).not.toHaveBeenCalled();
  });
});
