import { Request, Response } from "express";
import { LoginUseCase } from "../../../application/use-cases/auth/login.use-case";
import { LogoutUseCase } from "../../../application/use-cases/auth/logout.use-case";
import { RefreshTokenUseCase } from "../../../application/use-cases/auth/refresh-token.use-case";
import { LoginDTO, RefreshTokenDTO } from "../../../application/dto/auth.dto";
import { JwtService } from "../../../infrastructure/services/jwt.service";
import { RegisterUseCase } from "../../../application/use-cases/auth/register.use-case";

export class AuthController {
  constructor(
    private readonly loginUC: LoginUseCase,
    private readonly logoutUC: LogoutUseCase,
    private readonly refreshTokenUC: RefreshTokenUseCase,
    private readonly jwtService: JwtService,
    private readonly registerUC: RegisterUseCase,
  ) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const dto: LoginDTO = req.body;
      const result = await this.loginUC.execute(dto);

      // Return data directly to match OpenAPI spec (no success wrapper)
      res.json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          code: "AUTH_FAILED",
          message:
            error instanceof Error ? error.message : "Authentication failed",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.registerUC.execute(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: "REGISTRATION_FAILED",
          message:
            error instanceof Error ? error.message : "Registration failed",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const refreshToken: RefreshTokenDTO = req.body;

      if (!userId) {
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

      await this.logoutUC.execute(userId, refreshToken.refreshToken);

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: "LOGOUT_FAILED",
          message: error instanceof Error ? error.message : "Logout failed",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const dto: RefreshTokenDTO = req.body;
      const result = await this.refreshTokenUC.execute(dto);

      res.json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          code: "REFRESH_FAILED",
          message:
            error instanceof Error ? error.message : "Token refresh failed",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
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

      // Return user data directly to match OpenAPI spec (no success wrapper)
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        status: user.status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch user info",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
