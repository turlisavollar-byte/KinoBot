import { describe, expect, it } from "vitest";
import { canAccessDashboardPath } from "./navigation-access";

describe("dashboard route access", () => {
  it("keeps moderators on dashboard and personal settings", () => {
    const permissions = ["view:analytics", "read:users"];

    expect(canAccessDashboardPath("moderator", permissions, "/")).toBe(true);
    expect(canAccessDashboardPath("moderator", permissions, "/settings")).toBe(true);
    expect(canAccessDashboardPath("moderator", permissions, "/analytics")).toBe(false);
    expect(canAccessDashboardPath("moderator", permissions, "/users")).toBe(false);
    expect(canAccessDashboardPath("moderator", permissions, "/users/user-1")).toBe(false);
  });

  it("allows admins to open analytics and users only with the matching permission", () => {
    const permissions = ["view:analytics", "read:users"];

    expect(canAccessDashboardPath("admin", permissions, "/analytics")).toBe(true);
    expect(canAccessDashboardPath("admin", permissions, "/users")).toBe(true);
    expect(canAccessDashboardPath("admin", ["read:users"], "/analytics")).toBe(false);
  });

  it("allows superadmins to access all dashboard routes", () => {
    expect(canAccessDashboardPath("SUPER_ADMIN", [], "/system/security-center")).toBe(true);
  });
});
