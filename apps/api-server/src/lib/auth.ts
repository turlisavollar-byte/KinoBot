// lib/auth.ts

import type { Request, Response, NextFunction } from "express";
import { Logger } from "@/shared/utils/logger";
import { permissionCache } from "@/shared/utils/permission-cache";
import {
  hasRole as hasRoleHierarchy,
  normalizeRoleName,
  type Role,
} from "@/shared/constants/roles";
import { JwtService } from "@/modules/identity/infrastructure/services/jwt.service";
import { DrizzleUserRepository } from "@/modules/identity/infrastructure/repositories/drizzle-user.repository";

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
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      logger.warn("Unauthorized access attempt - no token", {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

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

    // Verify JWT token using Identity module
    const jwtService = JwtService.getInstance();
    const userRepo = new DrizzleUserRepository();

    const decoded = await jwtService.verify(token, "access");

    // Verify user still exists and is active
    const userEntity = await userRepo.findById(decoded.sub);
    if (!userEntity || !userEntity.isActive) {
      logger.warn("Unauthorized access attempt - invalid or inactive user", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userId: decoded.sub,
      });

      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or inactive user",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const user = {
      id: userEntity.id,
      email: userEntity.email,
      role: userEntity.role.name,
      permissions: userEntity.permissions.map((p) => p.name),
    };

    // The database state is authoritative so role changes take effect before
    // the old access token expires.
    const perms = user.permissions.length
      ? user.permissions
      : permissionCache.getPermissions(user.id, user.role as unknown as Role);

    (req as any).user = { ...user, permissions: perms };
    next();
  } catch (error) {
    logger.error("Auth middleware error", { error });
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication failed",
        timestamp: new Date().toISOString(),
      },
    });
  }
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
 * Optional auth middleware - doesn't require auth but adds user if present
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // If user is already set, continue
  if ((req as any).user) {
    return next();
  }

  // Try to extract user from token/session
  try {
    // This is a placeholder - implement your auth logic here
    // For example, extract from JWT token, session, etc.
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      // Verify token and set user
      // (req as any).user = verifyToken(token);
    }
  } catch (error) {
    // Silently fail - optional auth
    logger.debug("Optional auth failed", { error });
  }

  next();
}

/**
 * Auth middleware with custom user resolver
 */
export function withAuth(resolver: (req: Request) => Promise<AuthUser | null>) {
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
