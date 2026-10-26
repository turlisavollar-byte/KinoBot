import { describe, expect, it } from "vitest";
import {
  canAccessDashboardPath,
  canAccessNavigationPath,
} from "./navigation-access";

describe("dashboard route access", () => {
  it("keeps moderators on dashboard and personal settings", () => {
    const permissions = ["view:analytics", "read:users"];

    expect(canAccessDashboardPath("moderator", permissions, "/")).toBe(true);
    expect(canAccessDashboardPath("moderator", permissions, "/settings")).toBe(
      true,
    );
    expect(canAccessDashboardPath("moderator", permissions, "/analytics")).toBe(
      false,
    );
    expect(canAccessDashboardPath("moderator", permissions, "/users")).toBe(
      false,
    );
    expect(
      canAccessDashboardPath("moderator", permissions, "/users/user-1"),
    ).toBe(false);
  });

  it("allows admins to open analytics and users only with the matching permission", () => {
    const permissions = ["view:analytics", "read:users"];

    expect(canAccessDashboardPath("admin", permissions, "/analytics")).toBe(
      true,
    );
    expect(canAccessDashboardPath("admin", permissions, "/users")).toBe(true);
    expect(canAccessDashboardPath("admin", ["read:users"], "/analytics")).toBe(
      false,
    );
  });

  it("allows superadmins to access all dashboard routes", () => {
    expect(
      canAccessDashboardPath("SUPER_ADMIN", [], "/system/security-center"),
    ).toBe(true);
  });

  it("shows Video Codes navigation only when the matching permission is granted", () => {
    expect(
      canAccessNavigationPath(
        "admin",
        ["read:content"],
        "/telegram/video-codes",
      ),
    ).toBe(true);
    expect(
      canAccessNavigationPath(
        "admin",
        ["read:video_codes"],
        "/telegram/video-codes",
      ),
    ).toBe(false);
    expect(
      canAccessNavigationPath("superadmin", [], "/telegram/video-codes"),
    ).toBe(true);
  });

  it("maps admin navigation to permissions accepted by the backend", () => {
    const permissions = [
      "refund:payments",
      "read:content",
      "view:health",
      "read:sessions",
      "manage:security",
    ];

    expect(
      canAccessNavigationPath("admin", permissions, "/subscriptions/plans"),
    ).toBe(true);
    expect(
      canAccessNavigationPath("admin", permissions, "/telegram/video-codes"),
    ).toBe(true);
    expect(
      canAccessNavigationPath("admin", permissions, "/system/health"),
    ).toBe(true);
    expect(
      canAccessNavigationPath(
        "admin",
        permissions,
        "/system/session-management",
      ),
    ).toBe(true);
    expect(
      canAccessNavigationPath("admin", permissions, "/system/feature-flags"),
    ).toBe(true);
  });

  it("limits moderators to content and video-code navigation without granting system access", () => {
    const permissions = ["read:content", "update:content"];

    expect(
      canAccessNavigationPath("moderator", permissions, "/catalog/movies"),
    ).toBe(true);
    expect(
      canAccessNavigationPath(
        "moderator",
        permissions,
        "/telegram/video-codes",
      ),
    ).toBe(true);
    expect(
      canAccessNavigationPath("moderator", permissions, "/system/health"),
    ).toBe(false);
    expect(
      canAccessNavigationPath(
        "moderator",
        permissions,
        "/system/feature-flags",
      ),
    ).toBe(false);
    expect(canAccessNavigationPath("moderator", [], "/catalog/movies")).toBe(
      false,
    );
  });
});
