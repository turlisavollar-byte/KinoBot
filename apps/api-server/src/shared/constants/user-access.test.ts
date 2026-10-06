import { describe, expect, it } from "vitest";
import {
  canListAdminAccounts,
  canManageAdminAccount,
  canManageCustomerUser,
  canReadAdminAccount,
  canReadCustomerUser,
  getAdminAccountScope,
  getCustomerUserScope,
} from "./user-access";
import { getPermissions } from "./role-permissions";
import { Permission } from "./permissions";

describe("admin and customer access scopes", () => {
  it("gives superadmins unrestricted scopes", () => {
    expect(getCustomerUserScope("sa", "superadmin")).toEqual({});
    expect(getAdminAccountScope("sa", "superadmin")).toEqual({});
    expect(canReadAdminAccount("sa", "superadmin", "a", "superadmin")).toBe(true);
  });

  it("limits admins to customers, moderators, and their own account", () => {
    expect(getCustomerUserScope("admin-1", "admin")).toEqual({
      roles: ["user", "moderator", "manager"],
      includeId: "admin-1",
    });
    expect(getAdminAccountScope("admin-1", "admin")).toEqual({
      roles: ["moderator", "manager"],
      includeId: "admin-1",
    });
    expect(canReadAdminAccount("admin-1", "admin", "admin-2", "admin")).toBe(false);
    expect(canReadAdminAccount("admin-1", "admin", "mod-1", "moderator")).toBe(true);
    expect(canManageAdminAccount("admin-1", "admin", "mod-1", "moderator")).toBe(true);
  });

  it("limits moderators to customer users and their own account", () => {
    expect(getCustomerUserScope("mod-1", "moderator")).toEqual({
      roles: ["user"],
      includeId: "mod-1",
    });
    expect(getAdminAccountScope("mod-1", "moderator")).toEqual({
      selfOnly: true,
    });
    expect(canReadAdminAccount("mod-1", "moderator", "admin-1", "admin")).toBe(false);
    expect(canListAdminAccounts("moderator")).toBe(false);
    expect(canManageCustomerUser("mod-1", "moderator", "user-1", "user")).toBe(true);
    expect(canManageCustomerUser("mod-1", "moderator", "mod-2", "moderator")).toBe(false);
  });

  it("limits users and viewers to themselves", () => {
    expect(getCustomerUserScope("u1", "user")).toEqual({
      includeId: "u1",
      selfOnly: true,
    });
    expect(canReadCustomerUser("u1", "user", "u1", "user")).toBe(true);
    expect(canReadCustomerUser("u1", "user", "u2", "user")).toBe(false);
    expect(getCustomerUserScope("v1", "viewer")).toEqual({
      includeId: "v1",
      selfOnly: true,
    });
  });

  it("maps legacy manager and viewer roles without deleting them", () => {
    expect(getCustomerUserScope("manager-1", "manager").roles).toEqual([
      "user",
    ]);
    expect(getAdminAccountScope("admin-1", "admin").roles).toContain("manager");
    expect(getCustomerUserScope("viewer-1", "viewer").selfOnly).toBe(true);
  });

  it("allows self-read but never self-management of admin accounts", () => {
    expect(canReadAdminAccount("admin-1", "admin", "admin-1", "admin")).toBe(true);
    expect(canManageAdminAccount("admin-1", "admin", "admin-1", "admin")).toBe(false);
    expect(canListAdminAccounts("admin")).toBe(true);
    expect(canListAdminAccounts("superadmin")).toBe(true);
    expect(canListAdminAccounts("viewer")).toBe(false);
  });

  it("limits customer audit detail permission to admin and superadmin roles", () => {
    expect(getPermissions("superadmin")).toContain(Permission.READ_USER_AUDIT);
    expect(getPermissions("admin")).toContain(Permission.READ_USER_AUDIT);
    expect(getPermissions("moderator")).not.toContain(Permission.READ_USER_AUDIT);
    expect(getPermissions("manager")).not.toContain(Permission.READ_USER_AUDIT);
    expect(getPermissions("user")).not.toContain(Permission.READ_USER_AUDIT);
  });
});