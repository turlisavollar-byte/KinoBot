import type { Request, Response, NextFunction } from "express";

function getAuthenticatedPermissions(req: Request): string[] {
  const authUser = (req as Request & { user?: { permissions?: string[] } }).user;
  return authUser?.permissions || [];
}

export function requirePermission(permission: string | string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const permissions = getAuthenticatedPermissions(req);
    const requiredPermissions = Array.isArray(permission) ? permission : [permission];

    // Wildcard support: if user has '*' permission, they have all permissions
    const hasWildcard = permissions.includes('*');
    const hasPermission = hasWildcard || requiredPermissions.every((p) => permissions.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Missing required permissions: ${requiredPermissions.join(", ")}`,
          requiredPermissions,
          timestamp: new Date().toISOString(),
        }
      });
      return;
    }

    next();
  };
}

export function requireAnyPermission(permission: string | string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const permissions = getAuthenticatedPermissions(req);
    const requiredPermissions = Array.isArray(permission) ? permission : [permission];

    // Wildcard support: if user has '*' permission, they have all permissions
    const hasWildcard = permissions.includes('*');
    const hasPermission = hasWildcard || requiredPermissions.some((p) => permissions.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Missing any of required permissions: ${requiredPermissions.join(", ")}`,
          requiredPermissions,
          timestamp: new Date().toISOString(),
        }
      });
      return;
    }

    next();
  };
}

export function hasPermission(req: Request, permission: string): boolean {
  const permissions = getAuthenticatedPermissions(req);
  // Wildcard support: if user has '*' permission, they have all permissions
  return permissions.includes('*') || permissions.includes(permission);
}
