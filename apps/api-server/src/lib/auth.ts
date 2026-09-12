// lib/auth.ts - DEPRECATED
// ⚠️  This file is deprecated. Use @/shared/middleware/requireAuth instead.
// The canonical auth middleware is now in @/modules/identity/interface/http/middlewares/auth.middleware.ts
// This file is kept for backward compatibility during migration.

import type { Request, Response, NextFunction } from "express";
import { Logger } from "@/shared/utils/logger";
import {
  hasRole as hasRoleHierarchy,
  normalizeRoleName,
  type Role,
} from "@/shared/constants/roles";
import { requireAuth as canonicalRequireAuth } from "@/shared/middleware/requireAuth";

const logger = Logger.getInstance("Auth");

// ==================== Types ====================

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
  permissions?: string[];
  [key: string]: unknown;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: {
        id: string;
        [key: string]: unknown;
      };
    }
  }
}

// ==================== Middleware ====================

/**
 * Require authentication middleware
 * Uses JWT tokens from Identity module
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await canonicalRequireAuth(req, res, next);
}

/**
 * Require specific role middleware
 */
export function requireRole(role: string | string[]) {
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

    const roles = Array.isArray(role) ? role : [role];
    const normalizedUserRole = normalizeRoleName(String(user.role ?? ""));
    const normalizedRequiredRoles = roles.map((requiredRole) =>
      normalizeRoleName(requiredRole),
    );

    const hasRequiredRole = normalizedRequiredRoles.some((requiredRole) =>
      hasRoleHierarchy(normalizedUserRole, requiredRole),
    );

    if (!hasRequiredRole) {
      logger.warn("Insufficient role permissions", {
        userId: user.id,
        role: normalizedUserRole,
        requiredRole: normalizedRequiredRoles,
        path: req.path,
      });

      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
          requiredRole: normalizedRequiredRoles,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}

/**
 * Require specific permission middleware
 */
export function requirePermission(permission: string | string[]) {
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

    const permissions = Array.isArray(permission) ? permission : [permission];
    const userPermissions = user.permissions || [];

    const hasPermission = permissions.every((p) => userPermissions.includes(p));

    if (!hasPermission) {
      logger.warn("Insufficient permissions", {
        userId: user.id,
        permissions: userPermissions,
        requiredPermission: permissions,
        path: req.path,
      });

      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
          requiredPermission: permissions,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}

/**
 * Require specific scope middleware (for API keys)
 */
export function requireScope(scope: string | string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const scopes = (req as any).scopes || [];
    const requiredScopes = Array.isArray(scope) ? scope : [scope];

    const hasScope = requiredScopes.every((s) => scopes.includes(s));

    if (!hasScope) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient scope",
          requiredScope: requiredScopes,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}

/**
 * Optional auth middleware - DEPRECATED
 * This function is incomplete and should not be used.
 * Use @/modules/identity/interface/http/middlewares/auth.middleware.ts instead.
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  logger.warn(
    "optionalAuth from lib/auth.ts is deprecated and incomplete. Use Identity module's optionalAuth.",
  );
  // For now, just pass through - this is intentionally broken to force migration
  next();
}

/**
 * Auth middleware with custom user resolver - DEPRECATED
 * This function is deprecated. Use Identity module's auth middleware instead.
 */
export function withAuth(resolver: (req: Request) => Promise<AuthUser | null>) {
  logger.warn(
    "withAuth from lib/auth.ts is deprecated. Use Identity module's auth middleware.",
  );
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = await resolver(req);

      if (user) {
        (req as any).user = user;
      }

      next();
    } catch (error) {
      logger.error("Auth resolver failed", { error });
      next(error);
    }
  };
}

// ==================== Helpers ====================

/**
 * Get current user from request
 */
export function getCurrentUser(req: Request): AuthUser | null {
  return (req as any).user || null;
}

/**
 * Check if user has specific role
 */
export function hasRole(
  user: AuthUser | null | undefined,
  role: string,
): boolean {
  if (!user) return false;
  return normalizeRoleName(user.role ?? "") === normalizeRoleName(role);
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: AuthUser | null | undefined,
  permission: string,
): boolean {
  if (!user) return false;
  return (user.permissions || []).includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  if (!user) return false;
  return permissions.some((p) => (user.permissions || []).includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  if (!user) return false;
  return permissions.every((p) => (user.permissions || []).includes(p));
}

// ==================== Export ====================

export default {
  requireAuth,
  requireRole,
  requirePermission,
  requireScope,
  optionalAuth,
  withAuth,
  getCurrentUser,
  hasRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
};
