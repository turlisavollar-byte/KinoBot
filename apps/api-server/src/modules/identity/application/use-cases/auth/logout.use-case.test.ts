import { describe, expect, it, vi } from "vitest";
import { LogoutUseCase } from "./logout.use-case";
import type { ISessionRepository } from "../../../domain/repositories/ISessionRepository";
import { permissionCache } from "@/shared/utils/permission-cache";

describe("LogoutUseCase", () => {
  it("revokes the supplied refresh token for the authenticated user", async () => {
    const userRepo = {
      findById: vi.fn().mockResolvedValue({ id: "user-1" }),
    } as any;
    const sessionRepo = {
      revoke: vi.fn().mockResolvedValue(undefined),
    } as unknown as ISessionRepository;

    await new LogoutUseCase(userRepo, sessionRepo).execute(
      "user-1",
      "refresh-token",
    );

    expect(sessionRepo.revoke).toHaveBeenCalledWith("user-1", "refresh-token");
  });

  it("invalidates cached permissions for the logged-out user", async () => {
    const invalidateSpy = vi.spyOn(permissionCache, "invalidate");
    const userRepo = {
      findById: vi.fn().mockResolvedValue({ id: "user-1" }),
    } as any;
    const sessionRepo = {
      revoke: vi.fn().mockResolvedValue(undefined),
    } as unknown as ISessionRepository;

    await new LogoutUseCase(userRepo, sessionRepo).execute(
      "user-1",
      "refresh-token",
    );

    expect(invalidateSpy).toHaveBeenCalledWith("user-1");
  });
});
