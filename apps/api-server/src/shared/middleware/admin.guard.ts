import type { Request, Response, NextFunction } from "express";
import {
  hasRole,
  type Role,
  normalizeRoleName,
} from "@/shared/constants/roles";
import { accessControl } from "@/shared/utils/access-control";
import { Permission } from "@/shared/constants/permissions";

function getAuthenticatedRole(req: Request): Role | null {
  const authUser = (req as Request & { user?: { role?: string } }).user;
  const roleName =
    authUser?.role ??
    (req as Request & { admin?: { role?: string } }).admin?.role;
  if (!roleName) return null;
  return normalizeRoleName(roleName);
}

export function adminGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const role = getAuthenticatedRole(req);

  if (!role) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!accessControl.hasPermission(role, Permission.READ_USERS)) {
    res
      .status(403)
      .json({ error: "Forbidden", message: "Admin access required" });
    return;
  }

  next();
}

export function superAdminGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const role = getAuthenticatedRole(req);

  if (!role) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!hasRole(role, "superadmin")) {
    res
      .status(403)
      .json({ error: "Forbidden", message: "Super admin access required" });
    return;
  }

  next();
}

export function permissionGuard(requiredPermission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = getAuthenticatedRole(req);

    if (!role) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!accessControl.hasPermission(role, requiredPermission)) {
      res.status(403).json({
        error: "Forbidden",
        message: `Permission '${requiredPermission}' required`,
      });
      return;
    }

    next();
  };
}
