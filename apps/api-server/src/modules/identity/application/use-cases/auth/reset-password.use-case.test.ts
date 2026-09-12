import { describe, expect, it, vi } from "vitest";
import { ResetPasswordUseCase } from "./reset-password.use-case";
import type { ISessionRepository } from "../../../domain/repositories/ISessionRepository";

describe("ResetPasswordUseCase", () => {
  it("updates the password, clears the reset token, and revokes all sessions", async () => {
    const user = {
      id: "user-1",
      email: "person@example.com",
      resetExpiresAt: new Date(Date.now() + 60_000),
    };
    const userRepo = {
      findByResetToken: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(user),
    } as any;
    const passwordService = {
      validatePasswordStrength: vi
        .fn()
        .mockReturnValue({ isValid: true, errors: [] }),
      hash: vi.fn().mockResolvedValue("new-password-hash"),
    } as any;
    const sessionRepo = {
      revokeAll: vi.fn().mockResolvedValue(undefined),
    } as unknown as ISessionRepository;

    await new ResetPasswordUseCase(
      userRepo,
      passwordService,
      sessionRepo,
    ).execute("reset-token", "StrongPassword1!");

    expect(userRepo.update).toHaveBeenCalledWith("user-1", {
      passwordHash: "new-password-hash",
      resetToken: null,
      resetExpiresAt: null,
    });
    expect(sessionRepo.revokeAll).toHaveBeenCalledWith("user-1");
  });
});
