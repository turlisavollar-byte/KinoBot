import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: { log: vi.fn().mockResolvedValue({ id: "audit-login" }) },
}));

import { LoginUseCase } from "./login.use-case";
import { JwtService } from "../../../infrastructure/services/jwt.service";

describe("LoginUseCase forced password change response", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-for-testing";
    (JwtService as any).instance = null;
  });

  it("returns mustChangePassword without including any password hash", async () => {
    const user = {
      id: "admin-1",
      email: "admin@example.test",
      name: "Admin",
      passwordHash: "private-hash",
      role: { name: "admin" },
      permissions: [{ name: "read:users" }],
      isLocked: false,
      isActive: true,
      mustChangePassword: true,
      updateLastLogin: vi.fn().mockReturnThis(),
    };
    const userRepo = {
      findByEmail: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(user),
    };
    const passwordService = {
      verify: vi.fn().mockResolvedValue(true),
    };
    const sessionRepo = { create: vi.fn().mockResolvedValue(undefined) };

    const result = await new LoginUseCase(
      userRepo as any,
      passwordService as any,
      sessionRepo as any,
    ).execute({ email: user.email, password: "TemporaryPassword1!" });

    expect(result.mustChangePassword).toBe(true);
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(result)).not.toContain("private-hash");
    expect(sessionRepo.create).toHaveBeenCalledOnce();
  });
});