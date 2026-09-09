import {
  Role,
  RoleHierarchy,
  Roles,
  normalizeRoleName,
} from "@/shared/constants/roles";
import { Permission } from "@/shared/constants/permissions";
import { ROLE_PERMISSIONS } from "@/shared/constants/role-permissions";
import { accessControl } from "@/shared/utils/access-control";
import { permissionCache } from "@/shared/utils/permission-cache";
import { getSessionRepo, getUserRepo } from "@/modules/identity";
import { AssignRoleUseCase } from "../application/use-cases/assign-role.use-case";
import type {
  RoleInfo,
  RoleDetail,
  PermissionGrouped,
  PermissionCheckResult,
  RoleMatrix,
  AssignRoleResult,
} from "../types/rbac.types";

const PERMISSION_CATEGORIES: Record<string, string[]> = {
  Profile: ["read:own:profile", "update:own:profile", "delete:own:account"],
  Session: [
    "read:own:sessions",
    "revoke:own:sessions",
    "read:sessions",
    "revoke:sessions",
  ],
  Users: [
    "read:users",
    "create:users",
    "update:users",
    "delete:users",
    "read:any:profile",
    "update:any:profile",
    "lock:users",
    "unlock:users",
  ],
  Audit: ["read:audit_logs", "export:audit_logs", "manage:audit_logs"],
  RBAC: ["manage:roles", "manage:permissions"],
  System: ["manage:system", "view:analytics"],
  Content: [
    "read:content",
    "create:content",
    "update:content",
    "delete:content",
  ],
  Subscriptions: ["read:subscriptions", "manage:subscriptions"],
  Billing: ["read:billing", "manage:billing"],
  Telegram: ["read:telegram", "manage:telegram"],
  Notifications: [
    "read:notifications",
    "manage:notifications",
    "send:notifications",
  ],
};

function getCategory(permission: Permission): string {
  for (const [cat, perms] of Object.entries(PERMISSION_CATEGORIES)) {
    if (perms.includes(permission)) return cat;
  }
  return "Other";
}

function getInheritsFrom(role: Role): Role[] {
  const level = RoleHierarchy[role];
  return Object.values(Roles).filter(
    (r) => RoleHierarchy[r as Role] < level,
  ) as Role[];
}

export class RbacService {
  listRoles(): RoleInfo[] {
    return Object.values(Roles)
      .sort((a, b) => RoleHierarchy[a as Role] - RoleHierarchy[b as Role])
      .map((role) => ({
        role: role as Role,
        level: RoleHierarchy[role as Role],
        permissionCount: ROLE_PERMISSIONS[role as Role]?.length ?? 0,
        inheritsFrom: getInheritsFrom(role as Role),
      }));
  }

  getRoleDetail(role: Role): RoleDetail {
    return {
      role,
      level: RoleHierarchy[role],
      permissionCount: ROLE_PERMISSIONS[role]?.length ?? 0,
      inheritsFrom: getInheritsFrom(role),
      permissions: ROLE_PERMISSIONS[role] ?? [],
    };
  }

  listPermissionsGrouped(): PermissionGrouped[] {
    const allPermissions = Object.values(Permission);
    const allRoles = Object.values(Roles) as Role[];

    const grouped = new Map<
      string,
      { permission: Permission; roles: Role[] }[]
    >();

    for (const perm of allPermissions) {
      const cat = getCategory(perm);
      if (!grouped.has(cat)) grouped.set(cat, []);
      const roles = allRoles.filter((r) =>
        accessControl.hasPermission(r, perm),
      );
      grouped.get(cat)!.push({ permission: perm, roles });
    }

    return Array.from(grouped.entries()).map(([category, permissions]) => ({
      category,
      permissions,
    }));
  }

  getPermissionRoles(permission: Permission): Role[] {
    return Object.values(Roles).filter((r) =>
      accessControl.hasPermission(r as Role, permission),
    ) as Role[];
  }

  getMyPermissions(userId: string, role: Role): Permission[] {
    return permissionCache.getPermissions(userId, role);
  }

  checkPermission(
    userId: string,
    role: Role,
    permission: Permission,
  ): PermissionCheckResult {
    return {
      permission,
      granted: accessControl.hasPermission(role, permission),
      role,
      source: "direct",
    };
  }

  getMatrix(): RoleMatrix {
    const roles = Object.values(Roles).sort(
      (a, b) => RoleHierarchy[a as Role] - RoleHierarchy[b as Role],
    ) as Role[];
    const permissions = Object.values(Permission);

    const matrix = {} as Record<Role, Record<Permission, boolean>>;
    for (const role of roles) {
      matrix[role] = {} as Record<Permission, boolean>;
      for (const perm of permissions) {
        matrix[role][perm] = accessControl.hasPermission(role, perm);
      }
    }

    return { roles, permissions, matrix };
  }

  async assignRole(
    actorId: string,
    actorRole: Role,
    targetUserId: string,
    newRole: Role,
  ): Promise<AssignRoleResult> {
    const userRepo = getUserRepo();
    if (!userRepo) {
      throw new Error("User repository not available");
    }
    const sessionRepo = getSessionRepo();
    if (!sessionRepo) {
      throw new Error("Session repository not available");
    }
    return new AssignRoleUseCase(userRepo, sessionRepo).execute(
      actorId,
      actorRole,
      targetUserId,
      newRole,
    );
  }
}

export const rbacService = new RbacService();
