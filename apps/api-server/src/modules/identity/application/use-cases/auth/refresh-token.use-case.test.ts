import "reflect-metadata";
import { beforeEach, describe, expect, it } from "vitest";
import { RefreshTokenUseCase } from "./refresh-token.use-case";
import { JwtService } from "../../../infrastructure/services/jwt.service";

describe("RefreshTokenUseCase", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-for-testing";
    (JwtService as any).instance = null;
  });

  it("rejects a revoked refresh session", async () => {
    const jwt = JwtService.getInstance();
    const token = jwt.generateRefreshToken({
      sub: "user-1",
      email: "person@example.com",
      role: "user",
      permissions: [],
    });
    const userRepo = {
      findById: async () => ({
        id: "user-1",
        email: "person@example.com",
        name: "Person",
        isActive: true,
        role: { name: "user" },
        permissions: [],
      }),
    } as any;
    const sessionRepo = {
      rotate: async () => {
        throw new Error("Refresh token has been revoked or expired");
      },
    } as any;

    await expect(
      new RefreshTokenUseCase(userRepo, sessionRepo).execute({
        refreshToken: token,
      }),
    ).rejects.toThrow("revoked or expired");
  });

  it("does not rotate refresh tokens while password change is required", async () => {
    const jwt = JwtService.getInstance();
    const token = jwt.generateRefreshToken({
      sub: "admin-1",
      email: "admin@example.com",
      role: "admin",
      permissions: [],
    });
    const userRepo = {
      findById: async () => ({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        isActive: true,
        mustChangePassword: true,
        role: { name: "admin" },
        permissions: [],
      }),
    } as any;
    const sessionRepo = { rotate: vi.fn() } as any;

    await expect(
      new RefreshTokenUseCase(userRepo, sessionRepo).execute({
        refreshToken: token,
      }),
    ).rejects.toThrow("Password change is required");
    expect(sessionRepo.rotate).not.toHaveBeenCalled();
  });
});
