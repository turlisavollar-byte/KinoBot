const permissionByPath: Record<string, string> = {
  "/analytics": "view:analytics",
  "/users": "read:users",
  "/admin-users": "read:admin_users",
  "/subscriptions": "read:subscriptions",
  "/subscriptions/plans": "manage:plans",
  "/billing/payments": "read:payments",
  "/notifications": "read:notifications",
  "/telegram": "manage:telegram",
  "/telegram/video-codes": "read:video_codes",
  "/system/health": "view:health",
  "/system/security-center": "manage:security",
  "/system/session-management": "manage:sessions",
  "/system/feature-flags": "manage:features",
  "/system/audit-logs": "view:audit_logs",
};

function normalizeRole(role?: string | null): string {
  const normalized = role?.trim().toLowerCase().replaceAll("_", "") ?? "";
  return normalized === "superadmin" ? "superadmin" : normalized;
}

function isModeratorPersonalPath(path: string): boolean {
  return path === "/" || path === "/settings";
}

export function canAccessNavigationPath(
  role: string | null | undefined,
  permissions: readonly string[] | null | undefined,
  path: string,
): boolean {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "superadmin") return true;
  if (normalizedRole === "moderator") return isModeratorPersonalPath(path);
  if (isModeratorPersonalPath(path)) return true;

  const requiredPermission = permissionByPath[path] ??
    (path.startsWith("/catalog/") ? "read:content" : undefined);
  if (!requiredPermission) return false;
  return permissions?.includes(requiredPermission) ?? false;
}

export function canAccessDashboardPath(
  role: string | null | undefined,
  permissions: readonly string[] | null | undefined,
  path: string,
): boolean {
  if (path === "/" || path === "/settings") return true;

  const matchedPath = Object.keys(permissionByPath)
    .filter((candidate) => path === candidate || path.startsWith(`${candidate}/`))
    .sort((left, right) => right.length - left.length)[0];

  if (matchedPath) {
    return canAccessNavigationPath(role, permissions, matchedPath);
  }
  if (path.startsWith("/catalog/")) {
    return canAccessNavigationPath(role, permissions, "/catalog/movies");
  }
  return true;
}