import { describe, expect, it, vi } from "vitest";

const { auditLogMock } = vi.hoisted(() => ({ auditLogMock: vi.fn() }));

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: { log: auditLogMock },
}));

import { CreateAdminUserUseCase } from "./create-admin-user.use-case";

const input = {
  actorId: "superadmin-1",
  actorRole: "superadmin",
  email: "new@example.test",
  role: "moderator",
  password: "StrongPassword1!",
};

function makeDependencies() {
  return {
    repository: {
      emailExists: vi.fn().mockResolvedValue(false),
      findRoleId: vi.fn().mockResolvedValue("moderator-role-id"),
      createAdmin: vi.fn().mockResolvedValue({
        id: "admin-new",
        email: input.email,
        name: null,
        role: input.role,
        isActive: true,
        mustChangePassword: true,
        createdAt: new Date("2026-10-06T00:00:00.000Z"),
        updatedAt: new Date("2026-10-06T00:00:00.000Z"),
        lastLoginAt: null,
      }),
    },
    passwordService: {
      validatePasswordStrength: vi.fn().mockReturnValue({
        isValid: true,
        errors: [],
      }),
      hash: vi.fn().mockResolvedValue("bcrypt-hash-not-for-response"),
    },
  };
}

describe("CreateAdminUserUseCase", () => {
  it("rejects non-superadmins before creating an account", async () => {
    const { repository, passwordService } = makeDependencies();
    const useCase = new CreateAdminUserUseCase(
      repository as any,
      passwordService as any,
    );

    await expect(
      useCase.execute({ ...input, actorRole: "admin" }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.createAdmin).not.toHaveBeenCalled();
  });

  it("hashes the password and persists a forced-change account without returning secrets", async () => {
    const { repository, passwordService } = makeDependencies();
    const useCase = new CreateAdminUserUseCase(
      repository as any,
      passwordService as any,
    );

    const result = await useCase.execute(input);

    expect(passwordService.hash).toHaveBeenCalledWith(input.password);
    expect(repository.createAdmin).toHaveBeenCalledWith({
      email: input.email,
      role: "moderator",
      roleId: "moderator-role-id",
      passwordHash: "bcrypt-hash-not-for-response",
    });
    expect(result.mustChangePassword).toBe(true);
    expect(result).not.toHaveProperty("passwordHash");
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE",
        targetId: "admin-new",
        newValue: { email: input.email, role: "moderator" },
      }),
    );
    const auditPayload = JSON.stringify(auditLogMock.mock.calls[0][0]);
    expect(auditPayload).not.toContain(input.password);
    expect(auditPayload).not.toContain("bcrypt-hash-not-for-response");
  });

  it("does not allow creating a superadmin through the admin endpoint", async () => {
    const { repository, passwordService } = makeDependencies();
    const useCase = new CreateAdminUserUseCase(
      repository as any,
      passwordService as any,
    );

    await expect(
      useCase.execute({ ...input, role: "superadmin" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.createAdmin).not.toHaveBeenCalled();
  });
});