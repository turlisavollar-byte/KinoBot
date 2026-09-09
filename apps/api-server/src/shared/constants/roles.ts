export const RoleValues = [
  "superadmin",
  "admin",
  "manager",
  "user",
  "moderator",
  "viewer",
] as const;

export type Role = (typeof RoleValues)[number];

export const Roles = {
  SUPERADMIN: "superadmin",
  SUPER_ADMIN: "superadmin",
  ADMIN: "admin",
  MANAGER: "manager",
  USER: "user",
  MODERATOR: "moderator",
  VIEWER: "viewer",
} as const;

const roleAliasMap: Record<string, Role> = {
  superadmin: "superadmin",
  super_admin: "superadmin",
  admin: "admin",
  manager: "manager",
  user: "user",
  moderator: "moderator",
  viewer: "viewer",
};

export function normalizeRoleName(role?: string | null): Role {
  if (!role) return Roles.VIEWER;

  const key = role.trim().toLowerCase();
  return roleAliasMap[key] ?? (key === "user" ? Roles.USER : Roles.VIEWER);
}

export const RoleHierarchy: Record<Role, number> = {
  superadmin: 100,
  admin: 80,
  manager: 60,
  user: 40,
  moderator: 50,
  viewer: 10,
};

export function hasRole(userRole: string, requiredRole: Role): boolean {
  const normalizedUserRole = normalizeRoleName(userRole);
  const normalizedRequiredRole = normalizeRoleName(requiredRole);
  return (
    (RoleHierarchy[normalizedUserRole] ?? 0) >=
    RoleHierarchy[normalizedRequiredRole]
  );
}

export function canManage(actorRole: Role, targetRole: Role): boolean {
  const normalizedActorRole = normalizeRoleName(actorRole);
  const normalizedTargetRole = normalizeRoleName(targetRole);
  return (
    RoleHierarchy[normalizedActorRole] > RoleHierarchy[normalizedTargetRole]
  );
}
