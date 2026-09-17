import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { RegisterUseCase } from "./register.use-case";
import { DrizzleRoleRepository } from "../../../infrastructure/repositories/drizzle-role.repository";

describe("RegisterUseCase", () => {
  it("reports the password policy failure", async () => {
    const userRepo = { findByEmail: vi.fn() } as any;
    const roleRepo = { findByName: vi.fn() } as any;
    const passwordService = {
      validatePasswordStrength: vi.fn().mockReturnValue({
        isValid: false,
        errors: ["Password must contain at least one number"],
      }),
    } as any;

    await expect(
      new RegisterUseCase(userRepo, roleRepo, passwordService).execute({
        email: "person@example.com",
        name: "Person",
        password: "WeakPassword",
      }),
    ).rejects.toThrow("Password must contain at least one number");
    expect(userRepo.findByEmail).not.toHaveBeenCalled();
  });

  it("creates a standard user and never accepts a privileged role", async () => {
    vi.spyOn(DrizzleRoleRepository.prototype, "findByName").mockResolvedValue({
      name: "user",
      permissions: [],
    } as any);

    const roleRepo = {
      findByName: vi.fn().mockResolvedValue({
        name: "user",
        permissions: [],
      }),
    };
    const userRepo = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async (user) => user),
    } as any;
    const passwordService = {
      validatePasswordStrength: vi
        .fn()
        .mockReturnValue({ isValid: true, errors: [] }),
      hash: vi.fn().mockResolvedValue("bcrypt-hash"),
    } as any;

    const result = await new RegisterUseCase(
      userRepo,
      roleRepo as any,
      passwordService,
    ).execute({
      email: "person@example.com",
      name: "Person",
      password: "StrongPassword1!",
    });

    expect(result.user.role).toBe("user");
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: expect.objectContaining({ name: "user" }),
      }),
    );
  });
});
