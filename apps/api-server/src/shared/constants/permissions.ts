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
  BLOCK_USERS: "block:users",
  READ_ADMIN_USERS: "read:admin_users",
  CREATE_ADMIN_USERS: "create:admin_users",
  UPDATE_ADMIN_USERS: "update:admin_users",
  DELETE_ADMIN_USERS: "delete:admin_users",
  READ_ANY_PROFILE: "read:any:profile",
  UPDATE_ANY_PROFILE: "update:any:profile",
  LOCK_USERS: "lock:users",
  UNLOCK_USERS: "unlock:users",
  READ_AUDIT_LOGS: "view:audit_logs",
  EXPORT_AUDIT_LOGS: "export:analytics",
  MANAGE_AUDIT_LOGS: "manage:audit_logs",
  MANAGE_ROLES: "manage:security",
  MANAGE_PERMISSIONS: "manage:security",
  MANAGE_SYSTEM: "manage:security",
  VIEW_ANALYTICS: "view:analytics",
  EXPORT_ANALYTICS: "export:analytics",
  READ_CONTENT: "read:content",
  CREATE_CONTENT: "create:content",
  UPDATE_CONTENT: "update:content",
  DELETE_CONTENT: "delete:content",
  PUBLISH_CONTENT: "publish:content",
  READ_VIDEO_CODES: "read:video_codes",
  CREATE_VIDEO_CODES: "create:video_codes",
  UPDATE_VIDEO_CODES: "update:video_codes",
  DELETE_VIDEO_CODES: "delete:video_codes",
  ACTIVATE_VIDEO_CODES: "activate:video_codes",
  READ_SUBSCRIPTIONS: "read:subscriptions",
  CREATE_SUBSCRIPTIONS: "create:subscriptions",
  UPDATE_SUBSCRIPTIONS: "update:subscriptions",
  DELETE_SUBSCRIPTIONS: "delete:subscriptions",
  MANAGE_SUBSCRIPTIONS: "manage:subscriptions",
  MANAGE_PLANS: "manage:plans",
  READ_BILLING: "read:payments",
  MANAGE_BILLING: "refund:payments",
  READ_TELEGRAM: "manage:telegram",
  MANAGE_TELEGRAM: "manage:telegram",
  MANAGE_CHANNELS: "manage:channels",
  READ_NOTIFICATIONS: "read:notifications",
  CREATE_NOTIFICATIONS: "create:notifications",
  UPDATE_NOTIFICATIONS: "update:notifications",
  DELETE_NOTIFICATIONS: "delete:notifications",
  MANAGE_NOTIFICATIONS: "manage:notifications",
  SEND_NOTIFICATIONS: "send:notifications",
  VIEW_HEALTH: "view:health",
  MANAGE_FEATURES: "manage:features",
  MANAGE_SECURITY: "manage:security",
  MANAGE_SESSIONS: "manage:sessions",
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
