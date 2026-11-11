import { describe, expect, it, vi } from "vitest";

const { auditLogMock } = vi.hoisted(() => ({ auditLogMock: vi.fn() }));

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: { log: auditLogMock },
}));

import { ChangePasswordUseCase } from "./change-password.use-case";

describe("ChangePasswordUseCase", () => {
  it("hashes the new password, clears the forced-change flag, revokes sessions, and audits safely", async () => {
    const userRepo = {
      findById: vi.fn().mockResolvedValue({
        id: "admin-1",
        email: "admin@example.test",
        passwordHash: "temporary-hash",
      }),
      update: vi.fn().mockResolvedValue({ id: "admin-1" }),
    };
    const passwordService = {
      verify: vi.fn().mockResolvedValue(true),
      hash: vi.fn().mockResolvedValue("new-hash"),
      validatePasswordStrength: vi.fn().mockReturnValue({
        isValid: true,
        errors: [],
      }),
    };
    const sessionRepo = { revokeAll: vi.fn().mockResolvedValue(undefined) };

    const result = await new ChangePasswordUseCase(
      userRepo as any,
      passwordService as any,
      sessionRepo as any,
    ).execute("admin-1", "TemporaryPassword1!", "NewPassword2!");

    expect(result.success).toBe(true);
    expect(userRepo.update).toHaveBeenCalledWith("admin-1", {
      passwordHash: "new-hash",
      mustChangePassword: false,
    });
    expect(sessionRepo.revokeAll).toHaveBeenCalledWith("admin-1");
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        targetId: "admin-1",
        metadata: { event: "password_changed" },
      }),
    );
    const auditPayload = JSON.stringify(auditLogMock.mock.calls[0][0]);
    expect(auditPayload).not.toContain("TemporaryPassword1!");
    expect(auditPayload).not.toContain("NewPassword2!");
    expect(auditPayload).not.toContain("new-hash");
  });
});