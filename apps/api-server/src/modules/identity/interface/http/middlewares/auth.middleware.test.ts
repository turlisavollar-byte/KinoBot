import { describe, expect, it, vi } from "vitest";
import { AuthMiddleware } from "./auth.middleware";

function makeMiddleware() {
  const jwtService = {
    verify: vi.fn().mockResolvedValue({ sub: "admin-1" }),
  };
  const userRepo = {
    findById: vi.fn().mockResolvedValue({
      id: "admin-1",
      email: "admin@example.test",
      name: "Admin",
      role: { name: "admin" },
      permissions: [],
      status: "active",
      isActive: true,
      mustChangePassword: true,
    }),
  };
  return new AuthMiddleware(jwtService as any, userRepo as any);
}

function makeRequest(originalUrl: string) {
  return {
    originalUrl,
    headers: { authorization: "Bearer access-token" },
  } as any;
}

function makeResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as any;
}

describe("AuthMiddleware forced password change", () => {
  it("blocks protected actions with 403 while a password change is required", async () => {
    const middleware = makeMiddleware();
    const req = makeRequest("/api/admin/users");
    const res = makeResponse();
    const next = vi.fn();

    await middleware.requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "PASSWORD_CHANGE_REQUIRED" }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
    expect(req.user.mustChangePassword).toBe(true);
  });

  it.each([
    "/api/identity/auth/change-password",
    "/api/auth/logout",
    "/api/identity/auth/logout-all",
  ])("allows the recovery endpoint %s", async (originalUrl) => {
    const middleware = makeMiddleware();
    const req = makeRequest(originalUrl);
    const res = makeResponse();
    const next = vi.fn();

    await middleware.requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});