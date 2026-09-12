import {
  Role,
  RoleHierarchy,
  Roles,
  normalizeRoleName,
} from "@/shared/constants/roles";
import { Permission } from "@/shared/constants/permissions";
import { getSessionRepo, getUserRepo } from "@/modules/identity";
import { DrizzleRoleRepository } from "@/modules/identity/infrastructure/repositories/drizzle-role.repository";
import { AssignRoleUseCase } from "../application/use-cases/assign-role.use-case";
import type {
  RoleInfo,
  RoleDetail,
  PermissionGrouped,
  RoleMatrix,
  AssignRoleResult,
} from "../types/rbac.types";

const roleRepository = new DrizzleRoleRepository();

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
  async listRoles(): Promise<RoleInfo[]> {
    const roles = await roleRepository.findAll();
    return roles
      .map((role) => normalizeRoleName(role.name))
      .filter((role): role is Role => Boolean(role))
      .sort((a, b) => RoleHierarchy[a] - RoleHierarchy[b])
      .map((role) => ({
        role,
        level: RoleHierarchy[role],
        permissionCount:
          roles.find((item) => normalizeRoleName(item.name) === role)
            ?.permissions.length ?? 0,
        inheritsFrom: getInheritsFrom(role),
      }));
  }

  async getRoleDetail(role: Role): Promise<RoleDetail> {
    const roleEntity = await roleRepository.findByName(role);
    if (!roleEntity) throw new Error(`Role '${role}' not found`);

    return {
      role,
      level: roleEntity.level,
      permissionCount: roleEntity.permissions.length,
      inheritsFrom: getInheritsFrom(role),
      permissions: roleEntity.permissions.map(
        (permission) => permission.name as Permission,
      ),
    };
  }

  async listPermissionsGrouped(): Promise<PermissionGrouped[]> {
    const allPermissions = Object.values(Permission);
    const roleEntities = await roleRepository.findAll();
    const allRoles = roleEntities
      .map((role) => normalizeRoleName(role.name))
      .filter((role): role is Role => Boolean(role));

    const grouped = new Map<
      string,
      { permission: Permission; roles: Role[] }[]
    >();

    for (const perm of allPermissions) {
      const cat = getCategory(perm);
      if (!grouped.has(cat)) grouped.set(cat, []);
      const roles = roleEntities
        .filter((role) => role.hasPermission(perm))
        .map((role) => normalizeRoleName(role.name))
        .filter((role): role is Role => Boolean(role));
      grouped.get(cat)!.push({ permission: perm, roles });
    }

    return Array.from(grouped.entries()).map(([category, permissions]) => ({
      category,
      permissions,
    }));
  }

  async getPermissionRoles(permission: Permission): Promise<Role[]> {
    const roles = await roleRepository.findAll();
    return roles
      .filter((role) => role.hasPermission(permission))
      .map((role) => normalizeRoleName(role.name))
      .filter((role): role is Role => Boolean(role));
  }

  async getMatrix(): Promise<RoleMatrix> {
    const roleEntities = await roleRepository.findAll();
    const roles = roleEntities
      .map((role) => normalizeRoleName(role.name))
      .filter((role): role is Role => Boolean(role))
      .sort((a, b) => RoleHierarchy[a] - RoleHierarchy[b]);
    const permissions = Object.values(Permission);

    const matrix = {} as Record<Role, Record<Permission, boolean>>;
    for (const role of roles) {
      const roleEntity = roleEntities.find(
        (item) => normalizeRoleName(item.name) === role,
      );
      matrix[role] = {} as Record<Permission, boolean>;
      for (const perm of permissions) {
        matrix[role][perm] = roleEntity?.hasPermission(perm) ?? false;
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
