import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ??= "postgres://user:pass@localhost:5432/test";

const { requireAuth } = await import("./auth");
const { JwtService } =
  await import("@/modules/identity/infrastructure/services/jwt.service");
const { DrizzleUserRepository } =
  await import("@/modules/identity/infrastructure/repositories/drizzle-user.repository");

describe("requireAuth", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-for-testing";
    (JwtService as any).instance = null;
    (JwtService as any).warningShown = false;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    (JwtService as any).instance = null;
    (JwtService as any).warningShown = false;
    vi.restoreAllMocks();
  });

  it("uses current database permissions instead of stale JWT permissions", async () => {
    const jwtPermissions = ["CUSTOM_PERMISSION", "READ_USERS"];
    const userEntity = {
      id: "user-auth-regression",
      email: "admin@example.com",
      name: "Admin User",
      isActive: true,
      status: "active",
      role: { name: "admin" },
      permissions: [{ name: "READ_USERS" }],
    };

    vi.spyOn(DrizzleUserRepository.prototype, "findById").mockResolvedValue(
      userEntity as any,
    );

    const token = JwtService.getInstance().generateAccessToken({
      sub: userEntity.id,
      email: userEntity.email,
      role: userEntity.role.name,
      permissions: jwtPermissions,
    });

    const req = {
      headers: { authorization: `Bearer ${token}` },
      ip: "127.0.0.1",
      path: "/api/users",
      method: "GET",
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: userEntity.id, role: "admin" });
    expect(req.user.permissions).toEqual(["READ_USERS"]);
  });
});
