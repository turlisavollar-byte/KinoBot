import { Request, Response, NextFunction } from "express";
import {
  hasRole,
  normalizeRoleName,
  type Role,
  RoleHierarchy,
} from "@/shared/constants/roles";

export class RbacMiddleware {
  requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (!user.permissions || !user.permissions.includes(permission)) {
        res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Permission required: ${permission}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      next();
    };
  }

  requireAnyPermission(permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (
        !user.permissions ||
        !permissions.some((p) => user.permissions.includes(p))
      ) {
        res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `One of these permissions required: ${permissions.join(", ")}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      next();
    };
  }

  requireAllPermissions(permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (
        !user.permissions ||
        !permissions.every((p) => user.permissions.includes(p))
      ) {
        res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `All of these permissions required: ${permissions.join(", ")}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      next();
    };
  }

  requireRole(role: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const normalizedUserRole = normalizeRoleName(String(user.role ?? ""));
      const normalizedRequiredRole = normalizeRoleName(role) as Role;

      if (!hasRole(normalizedUserRole, normalizedRequiredRole)) {
        res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Role required: ${normalizedRequiredRole} or higher`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      next();
    };
  }

  requireMinRoleLevel(minLevel: number) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userRoleLevel =
        RoleHierarchy[normalizeRoleName(String(user.role ?? ""))] ?? 0;

      if (userRoleLevel < minLevel) {
        res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Minimum role level required: ${minLevel}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      next();
    };
  }
}
