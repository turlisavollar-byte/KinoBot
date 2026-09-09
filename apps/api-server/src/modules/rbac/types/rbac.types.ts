import type { Role } from "@/shared/constants/roles";
import type { Permission } from "@/shared/constants/permissions";

export interface RoleInfo {
  role: Role;
  level: number;
  permissionCount: number;
  inheritsFrom: Role[];
}

export interface RoleDetail extends RoleInfo {
  permissions: Permission[];
}

export interface PermissionInfo {
  permission: Permission;
  category: string;
  roles: Role[];
}

export interface PermissionGrouped {
  category: string;
  permissions: { permission: Permission; roles: Role[] }[];
}

export interface PermissionCheckResult {
  permission: Permission;
  granted: boolean;
  role: Role;
  source: "direct";
}

export interface RoleMatrix {
  roles: Role[];
  permissions: Permission[];
  matrix: Record<Role, Record<Permission, boolean>>;
}

export interface AssignRoleResult {
  userId: string;
  previousRole: Role;
  newRole: Role;
  updatedAt: Date;
}
