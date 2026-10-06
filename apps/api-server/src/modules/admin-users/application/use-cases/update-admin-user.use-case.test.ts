import { describe, expect, it, vi } from "vitest";
import { UpdateAdminUserUseCase } from "./update-admin-user.use-case";

describe("UpdateAdminUserUseCase role scope", () => {
  it("allows an admin to update their own profile but not their role", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({ id: "admin-1", role: "admin" }),
      update: vi.fn().mockResolvedValue({ id: "admin-1" }),
      findRoleId: vi.fn(),
    };
    const useCase = new UpdateAdminUserUseCase(repository as any);

    await useCase.execute({
      actorId: "admin-1",
      actorRole: "admin",
      targetId: "admin-1",
      name: "Updated name",
    });

    expect(repository.update).toHaveBeenCalledWith("admin-1", {
      name: "Updated name",
    });
    await expect(
      useCase.execute({
        actorId: "admin-1",
        actorRole: "admin",
        targetId: "admin-1",
        role: "superadmin",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("denies an admin from editing an equal-role admin", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({ id: "admin-2", role: "admin" }),
      update: vi.fn(),
    };
    const useCase = new UpdateAdminUserUseCase(repository as any);

    await expect(
      useCase.execute({
        actorId: "admin-1",
        actorRole: "admin",
        targetId: "admin-2",
        name: "Not allowed",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("allows an admin to manage a moderator but not promote them to admin", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({ id: "mod-1", role: "moderator" }),
      update: vi.fn().mockResolvedValue({ id: "mod-1" }),
      findRoleId: vi.fn().mockResolvedValue("role-admin-id"),
    };
    const useCase = new UpdateAdminUserUseCase(repository as any);

    await useCase.execute({
      actorId: "admin-1",
      actorRole: "admin",
      targetId: "mod-1",
      name: "Moderator name",
    });
    expect(repository.update).toHaveBeenCalledOnce();

    repository.update.mockClear();
    await expect(
      useCase.execute({
        actorId: "admin-1",
        actorRole: "admin",
        targetId: "mod-1",
        role: "admin",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.update).not.toHaveBeenCalled();
  });
});