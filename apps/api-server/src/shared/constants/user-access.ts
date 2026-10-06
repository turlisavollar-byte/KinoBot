import { normalizeRoleName } from "./roles";

export interface UserAccessScope {
  roles?: string[];
  includeId?: string;
  selfOnly?: boolean;
}

const CUSTOMER_ROLE_SCOPE: Record<string, string[]> = {
  superadmin: [],
  admin: ["user", "moderator", "manager"],
  moderator: ["user"],
  manager: ["user"],
  viewer: [],
  user: [],
};

const ADMIN_ROLE_SCOPE: Record<string, string[]> = {
  superadmin: [],
  admin: ["moderator", "manager"],
  moderator: [],
  manager: [],
  viewer: [],
  user: [],
};

function normalized(role: string): string {
  return normalizeRoleName(role);
}

export function getCustomerUserScope(
  actorId: string,
  actorRole: string,
): UserAccessScope {
  const role = normalized(actorRole);
  if (role === "superadmin") return {};

  const roles = CUSTOMER_ROLE_SCOPE[role] ?? [];
  if (roles.length === 0) return { includeId: actorId, selfOnly: true };
  return { roles, includeId: actorId };
}

export function canReadCustomerUser(
  actorId: string,
  actorRole: string,
  targetId: string,
  targetRole: string,
): boolean {
  if (actorId === targetId) return true;

  const role = normalized(actorRole);
  if (role === "superadmin") return true;
  return (CUSTOMER_ROLE_SCOPE[role] ?? []).includes(normalized(targetRole));
}

export function canManageCustomerUser(
  actorId: string,
  actorRole: string,
  targetId: string,
  targetRole: string,
): boolean {
  if (actorId === targetId) return false;

  const role = normalized(actorRole);
  if (role === "superadmin") return true;
  return (CUSTOMER_ROLE_SCOPE[role] ?? []).includes(normalized(targetRole));
}

export function getAdminAccountScope(
  actorId: string,
  actorRole: string,
): UserAccessScope {
  const role = normalized(actorRole);
  if (role === "superadmin") return {};

  const roles = ADMIN_ROLE_SCOPE[role] ?? [];
  if (roles.length === 0) {
    return role === "admin"
      ? { includeId: actorId, selfOnly: true }
      : { selfOnly: true };
  }

  return { roles, includeId: actorId };
}

export function canReadAdminAccount(
  actorId: string,
  actorRole: string,
  targetId: string,
  targetRole: string,
): boolean {
  const role = normalized(actorRole);
  if (role === "moderator" || role === "manager") return false;
  if (actorId === targetId) return true;
  if (role === "superadmin") return true;
  return (ADMIN_ROLE_SCOPE[role] ?? []).includes(normalized(targetRole));
}

export function canManageAdminAccount(
  actorId: string,
  actorRole: string,
  targetId: string,
  targetRole: string,
): boolean {
  if (actorId === targetId) return false;

  const role = normalized(actorRole);
  if (role === "superadmin") return true;
  return (ADMIN_ROLE_SCOPE[role] ?? []).includes(normalized(targetRole));
}

export function canListAdminAccounts(actorRole: string): boolean {
  const role = normalized(actorRole);
  return role === "superadmin" || role === "admin";
}