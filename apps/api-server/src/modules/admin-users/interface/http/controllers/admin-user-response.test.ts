import { describe, expect, it } from "vitest";
import { toSafeAdminUser } from "./admin-user-response";

describe("toSafeAdminUser", () => {
  it("returns only whitelisted account fields", () => {
    const now = new Date("2026-10-06T00:00:00.000Z");
    const response = toSafeAdminUser({
      id: "admin-1",
      email: "admin@example.test",
      name: "Admin",
      role: "admin",
      isActive: true,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
      passwordHash: "must-not-escape",
      tokenHash: "must-not-escape",
      resetToken: "must-not-escape",
      verificationToken: "must-not-escape",
    });

    expect(response).toEqual({
      id: "admin-1",
      email: "admin@example.test",
      name: "Admin",
      role: "admin",
      isActive: true,
      status: "active",
      lastLoginAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    expect(response).not.toHaveProperty("passwordHash");
    expect(response).not.toHaveProperty("tokenHash");
    expect(response).not.toHaveProperty("resetToken");
    expect(response).not.toHaveProperty("verificationToken");
  });
});