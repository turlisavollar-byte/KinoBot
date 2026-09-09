export const Permissions = {
  READ_OWN_PROFILE: "read:own:profile",
  UPDATE_OWN_PROFILE: "update:own:profile",
  DELETE_OWN_ACCOUNT: "delete:own:account",
  READ_OWN_SESSIONS: "read:own:sessions",
  REVOKE_OWN_SESSIONS: "revoke:own:sessions",
  READ_SESSIONS: "read:sessions",
  REVOKE_SESSIONS: "revoke:sessions",
  READ_USERS: "read:users",
  CREATE_USERS: "create:users",
  UPDATE_USERS: "update:users",
  DELETE_USERS: "delete:users",
  READ_ANY_PROFILE: "read:any:profile",
  UPDATE_ANY_PROFILE: "update:any:profile",
  LOCK_USERS: "lock:users",
  UNLOCK_USERS: "unlock:users",
  READ_AUDIT_LOGS: "read:audit_logs",
  EXPORT_AUDIT_LOGS: "export:audit_logs",
  MANAGE_AUDIT_LOGS: "manage:audit_logs",
  MANAGE_ROLES: "manage:roles",
  MANAGE_PERMISSIONS: "manage:permissions",
  MANAGE_SYSTEM: "manage:system",
  VIEW_ANALYTICS: "view:analytics",
  READ_CONTENT: "read:content",
  CREATE_CONTENT: "create:content",
  UPDATE_CONTENT: "update:content",
  DELETE_CONTENT: "delete:content",
  READ_SUBSCRIPTIONS: "read:subscriptions",
  MANAGE_SUBSCRIPTIONS: "manage:subscriptions",
  READ_BILLING: "read:billing",
  MANAGE_BILLING: "manage:billing",
  READ_TELEGRAM: "read:telegram",
  MANAGE_TELEGRAM: "manage:telegram",
  READ_NOTIFICATIONS: "read:notifications",
  MANAGE_NOTIFICATIONS: "manage:notifications",
  SEND_NOTIFICATIONS: "send:notifications",
} as const;

export type PermissionName = (typeof Permissions)[keyof typeof Permissions];
export type Permission = PermissionName;
export const Permission = Permissions;

export function normalizePermissionName(
  permission?: string | null,
): PermissionName | null {
  if (!permission) return null;

  const candidate = permission.trim();
  return (
    Object.values(Permissions).find(
      (value) =>
        value === candidate || value.toLowerCase() === candidate.toLowerCase(),
    ) ?? null
  );
}
