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
      findById: async () => ({ id: "user-1", isActive: true }),
    } as any;
    const sessionRepo = {
      isActive: async () => false,
    } as any;

    await expect(
      new RefreshTokenUseCase(userRepo, sessionRepo).execute({
        refreshToken: token,
      }),
    ).rejects.toThrow("revoked or expired");
  });
});
