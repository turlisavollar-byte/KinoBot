import type { Request, Response, NextFunction } from "express";
import {
  hasRole,
  normalizeRoleName,
  type Role,
} from "@/shared/constants/roles";

function getAuthenticatedRole(req: Request): Role | null {
  const authUser = (req as Request & { user?: { role?: string } }).user;
  const roleName = authUser?.role;
  if (!roleName) return null;
  return normalizeRoleName(roleName);
}

export function requireRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = getAuthenticatedRole(req);

    if (!role) {
      res.status(401).json({ 
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
          timestamp: new Date().toISOString(),
        }
      });
      return;
    }

    if (!hasRole(role, minRole)) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Requires ${minRole} role or higher`,
          timestamp: new Date().toISOString(),
        }
      });
      return;
    }

    next();
  };
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  return requireRole("admin")(req, res, next);
}

export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  return requireRole("superadmin")(req, res, next);
}

export function requireModeratorOrAbove(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  return requireRole("moderator")(req, res, next);
}
