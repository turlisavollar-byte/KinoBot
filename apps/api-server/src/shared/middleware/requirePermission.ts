import type { Request, Response, NextFunction } from "express";
import { getPermissions } from "@/shared/constants/role-permissions";
import { normalizeRoleName } from "@/shared/constants/roles";
import { normalizePermissionName } from "@/shared/constants/permissions";

function normalizePermissionSet(permissions: Iterable<string>): string[] {
  return [
    ...new Set(
      Array.from(
        permissions,
        (permission) => normalizePermissionName(permission) ?? permission,
      ).map((permission) => permission.trim().toLowerCase()),
    ),
  ];
}

function getAuthenticatedPermissions(req: Request): string[] {
  const authUser = (
    req as Request & {
      user?: {
        permissions?: string[];
        role?: string;
      };
    }
  ).user;

  const explicitPermissions = authUser?.permissions ?? [];
  const normalizedRole = authUser?.role
    ? normalizeRoleName(authUser.role)
    : null;
  const rolePermissions = normalizedRole ? getPermissions(normalizedRole) : [];

  return normalizePermissionSet([...explicitPermissions, ...rolePermissions]);
}

export function requirePermission(permission: string | string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const permissions = getAuthenticatedPermissions(req);
    const requiredPermissions = Array.isArray(permission)
      ? permission
      : [permission];
    const normalizedRequiredPermissions =
      normalizePermissionSet(requiredPermissions);

    // Wildcard support: if user has '*' permission, they have all permissions
    const hasWildcard = permissions.includes("*");
    const hasPermission =
      hasWildcard ||
      normalizedRequiredPermissions.every((p) => permissions.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Missing required permissions: ${normalizedRequiredPermissions.join(", ")}`,
          requiredPermissions: normalizedRequiredPermissions,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}

export function requireAnyPermission(permission: string | string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const permissions = getAuthenticatedPermissions(req);
    const requiredPermissions = Array.isArray(permission)
      ? permission
      : [permission];
    const normalizedRequiredPermissions =
      normalizePermissionSet(requiredPermissions);

    // Wildcard support: if user has '*' permission, they have all permissions
    const hasWildcard = permissions.includes("*");
    const hasPermission =
      hasWildcard ||
      normalizedRequiredPermissions.some((p) => permissions.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Missing any of required permissions: ${normalizedRequiredPermissions.join(", ")}`,
          requiredPermissions: normalizedRequiredPermissions,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}

export function hasPermission(req: Request, permission: string): boolean {
  const permissions = getAuthenticatedPermissions(req);
  const normalizedPermission = normalizePermissionName(permission);
  // Wildcard support: if user has '*' permission, they have all permissions
  return (
    permissions.includes("*") ||
    permissions.includes(
      normalizedPermission ?? permission.trim().toLowerCase(),
    )
  );
}
