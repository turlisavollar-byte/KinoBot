import { Permission } from "@/shared/constants/permissions";
import { Role, RoleHierarchy } from "@/shared/constants/roles";
import { hasPermission, getPermissions } from "@/shared/constants/role-permissions";

export class AccessControl {
  hasPermission(role: Role, permission: Permission): boolean {
    return hasPermission(role, permission);
  }

  hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some(perm => this.hasPermission(role, perm));
  }

  hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every(perm => this.hasPermission(role, perm));
  }

  getPermissions(role: Role): Permission[] {
    return getPermissions(role);
  }

  canManage(actorRole: Role, targetRole: Role): boolean {
    return RoleHierarchy[actorRole] > RoleHierarchy[targetRole];
  }

  canAccessResource(role: Role, resource: string, action: string): boolean {
    const permission = `${action}:${resource}` as Permission;
    return this.hasPermission(role, permission);
  }
}

export const accessControl = new AccessControl();
