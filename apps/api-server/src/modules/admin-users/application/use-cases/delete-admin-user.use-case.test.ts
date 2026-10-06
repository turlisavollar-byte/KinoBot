import { describe, expect, it, vi } from "vitest";
import { DeleteAdminUserUseCase } from "./delete-admin-user.use-case";

describe("DeleteAdminUserUseCase role scope", () => {
  it("allows an admin to delete a moderator account", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({ id: "mod-1", role: "moderator" }),
      softDelete: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new DeleteAdminUserUseCase(repository as any);

    await useCase.execute("admin-1", "admin", "mod-1");

    expect(repository.softDelete).toHaveBeenCalledWith("mod-1");
  });

  it("denies an admin from deleting an equal-role admin", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({ id: "admin-2", role: "admin" }),
      softDelete: vi.fn(),
    };
    const useCase = new DeleteAdminUserUseCase(repository as any);

    await expect(
      useCase.execute("admin-1", "admin", "admin-2"),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it("denies self-deletion", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({ id: "admin-1", role: "admin" }),
      softDelete: vi.fn(),
    };
    const useCase = new DeleteAdminUserUseCase(repository as any);

    await expect(
      useCase.execute("admin-1", "admin", "admin-1"),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.softDelete).not.toHaveBeenCalled();
  });
});