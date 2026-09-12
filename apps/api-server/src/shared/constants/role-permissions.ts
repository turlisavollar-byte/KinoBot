import { Permission } from "./permissions";
import { Role } from "./roles";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  superadmin: [
    // All permissions
    ...Object.values(Permission),
  ],
  admin: [
    // Profile
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,

    // Session
    Permission.READ_OWN_SESSIONS,
    Permission.REVOKE_OWN_SESSIONS,
    Permission.READ_SESSIONS,
    Permission.REVOKE_SESSIONS,

    // Users
    Permission.READ_USERS,
    Permission.CREATE_USERS,
    Permission.UPDATE_USERS,
    Permission.DELETE_USERS,
    Permission.READ_ADMIN_USERS,
    Permission.CREATE_ADMIN_USERS,
    Permission.UPDATE_ADMIN_USERS,
    Permission.DELETE_ADMIN_USERS,
    Permission.READ_ANY_PROFILE,
    Permission.UPDATE_ANY_PROFILE,
    Permission.LOCK_USERS,
    Permission.UNLOCK_USERS,

    // Audit
    Permission.READ_AUDIT_LOGS,
    Permission.EXPORT_AUDIT_LOGS,
    Permission.MANAGE_AUDIT_LOGS,

    // RBAC
    Permission.MANAGE_ROLES,

    // System
    Permission.MANAGE_SYSTEM,
    Permission.VIEW_ANALYTICS,

    // Content
    Permission.READ_CONTENT,
    Permission.CREATE_CONTENT,
    Permission.UPDATE_CONTENT,
    Permission.DELETE_CONTENT,

    // Subscriptions
    Permission.READ_SUBSCRIPTIONS,
    Permission.MANAGE_SUBSCRIPTIONS,

    // Billing
    Permission.READ_BILLING,
    Permission.MANAGE_BILLING,

    // Telegram
    Permission.READ_TELEGRAM,
    Permission.MANAGE_TELEGRAM,

    // Notifications
    Permission.READ_NOTIFICATIONS,
    Permission.MANAGE_NOTIFICATIONS,
    Permission.SEND_NOTIFICATIONS,
  ],
  manager: [
    // Profile
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,

    // Session
    Permission.READ_OWN_SESSIONS,
    Permission.REVOKE_OWN_SESSIONS,

    // Users
    Permission.READ_USERS,
    Permission.UPDATE_USERS,
    Permission.READ_ANY_PROFILE,
    Permission.LOCK_USERS,
    Permission.UNLOCK_USERS,

    // Audit
    Permission.READ_AUDIT_LOGS,

    // System
    Permission.VIEW_ANALYTICS,

    // Content
    Permission.READ_CONTENT,
    Permission.CREATE_CONTENT,
    Permission.UPDATE_CONTENT,

    // Subscriptions
    Permission.READ_SUBSCRIPTIONS,
    Permission.MANAGE_SUBSCRIPTIONS,

    // Billing
    Permission.READ_BILLING,

    // Telegram
    Permission.READ_TELEGRAM,

    // Notifications
    Permission.READ_NOTIFICATIONS,
    Permission.SEND_NOTIFICATIONS,
  ],
  moderator: [
    // Profile
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,

    // Session
    Permission.READ_OWN_SESSIONS,
    Permission.REVOKE_OWN_SESSIONS,

    // Users
    Permission.READ_USERS,

    // System
    Permission.VIEW_ANALYTICS,

    // Content
    Permission.READ_CONTENT,
    Permission.UPDATE_CONTENT,

    // Subscriptions
    Permission.READ_SUBSCRIPTIONS,

    // Telegram
    Permission.READ_TELEGRAM,
  ],
  user: [
    Permission.READ_OWN_PROFILE,
    Permission.READ_OWN_SESSIONS,
    Permission.READ_CONTENT,
    Permission.VIEW_ANALYTICS,
    Permission.READ_SUBSCRIPTIONS,
  ],
  viewer: [
    // Profile
    Permission.READ_OWN_PROFILE,

    // Session
    Permission.READ_OWN_SESSIONS,

    // Content
    Permission.READ_CONTENT,
    Permission.VIEW_ANALYTICS,
    Permission.READ_SUBSCRIPTIONS,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
