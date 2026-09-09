import { Request, Response, NextFunction } from "express";
import {
  JwtService,
  JwtPayload,
} from "../../../infrastructure/services/jwt.service";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";

export class AuthMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepo: IUserRepository,
  ) {}

  async requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const token = this.extractToken(req);

      if (!token) {
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

      const decoded = await this.jwtService.verify(token, "access");

      // Verify user still exists and is active
      const user = await this.userRepo.findById(decoded.sub);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "User not found",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "User account is not active",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions: user.permissions.map((p) => p.name),
        status: user.status,
      };

      next();
    } catch (error) {
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

  async optionalAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const token = this.extractToken(req);

      if (!token) {
        next();
        return;
      }

      const decoded = await this.jwtService.verify(token, "access");

      const user = await this.userRepo.findById(decoded.sub);
      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name,
          permissions: user.permissions.map((p) => p.name),
          status: user.status,
        };
      }

      next();
    } catch {
      // Ignore errors for optional auth
      next();
    }
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.slice(7);
  }
}
