import { Request, Response } from "express";
import { LoginUseCase } from "../../../application/use-cases/auth/login.use-case";
import { LogoutUseCase } from "../../../application/use-cases/auth/logout.use-case";
import { RefreshTokenUseCase } from "../../../application/use-cases/auth/refresh-token.use-case";
import {
  LoginDTO,
  RefreshTokenDTO,
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../../../application/dto/auth.dto";
import { JwtService } from "../../../infrastructure/services/jwt.service";
import { RegisterUseCase } from "../../../application/use-cases/auth/register.use-case";
import { SendVerificationEmailUseCase } from "../../../application/use-cases/auth/send-verification-email.use-case";
import { VerifyEmailUseCase } from "../../../application/use-cases/auth/verify-email.use-case";
import { RequestPasswordResetUseCase } from "../../../application/use-cases/auth/request-password-reset.use-case";
import { ResetPasswordUseCase } from "../../../application/use-cases/auth/reset-password.use-case";
import { Logger } from "@/shared/utils/logger";

export class AuthController {
  constructor(
    private readonly loginUC: LoginUseCase,
    private readonly logoutUC: LogoutUseCase,
    private readonly refreshTokenUC: RefreshTokenUseCase,
    private readonly jwtService: JwtService,
    private readonly registerUC: RegisterUseCase,
    private readonly sendVerificationEmailUC: SendVerificationEmailUseCase,
    private readonly verifyEmailUC: VerifyEmailUseCase,
    private readonly requestPasswordResetUC: RequestPasswordResetUseCase,
    private readonly resetPasswordUC: ResetPasswordUseCase,
  ) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const dto: LoginDTO = { ...loginSchema.parse(req.body) };

      // Extract session metadata from request
      const ip = req.ip || req.connection.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const device = this.parseUserAgent(userAgent);

      dto.sessionMetadata = {
        ip,
        userAgent,
        device,
        sessionName: device || "Unknown Device",
      };

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

  private parseUserAgent(userAgent: string): string {
    // Simple user agent parsing
    if (
      userAgent.includes("Mobile") ||
      userAgent.includes("Android") ||
      userAgent.includes("iPhone")
    ) {
      return "Mobile";
    }
    if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
      return "Tablet";
    }
    if (
      userAgent.includes("Windows") ||
      userAgent.includes("Macintosh") ||
      userAgent.includes("Linux")
    ) {
      return "Desktop";
    }
    return "Unknown";
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const registerDTO = registerSchema.parse(req.body);
      const registerResult = await this.registerUC.execute(registerDTO);

      // Auto-login after registration - generate tokens
      const loginDTO: LoginDTO = {
        email: registerDTO.email,
        password: registerDTO.password,
        sessionMetadata: {
          ip: req.ip || req.connection.remoteAddress || "unknown",
          userAgent: req.headers["user-agent"] || "unknown",
          device: this.parseUserAgent(req.headers["user-agent"] || "unknown"),
          sessionName:
            this.parseUserAgent(req.headers["user-agent"] || "unknown") ||
            "Unknown Device",
        },
      };

      const loginResult = await this.loginUC.execute(loginDTO);

      // Return auth result to match OpenAPI spec
      res.status(201).json({
        user: loginResult.user,
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken,
        expiresIn: loginResult.expiresIn,
      });
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

      const token =
        typeof refreshToken?.refreshToken === "string"
          ? refreshToken.refreshToken
          : null;
      await this.logoutUC.execute(userId, token);

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

  async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

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

      await this.logoutUC.execute(userId, null); // null means logout all

      res.json({
        success: true,
        message: "Logged out from all devices successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: "LOGOUT_ALL_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Logout from all devices failed",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const dto: RefreshTokenDTO = refreshTokenSchema.parse(req.body);
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

  async sendVerificationEmail(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

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

      await this.sendVerificationEmailUC.execute(userId);

      res.json({
        success: true,
        message: "Verification email sent",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: "VERIFICATION_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to send verification email",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = verifyEmailSchema.parse(req.body);

      const result = await this.verifyEmailUC.execute(token);

      res.json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: "VERIFICATION_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Email verification failed",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = requestPasswordResetSchema.parse(req.body);

      await this.requestPasswordResetUC.execute(email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message:
          "If an account with this email exists, a password reset link has been sent",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: "PASSWORD_RESET_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to request password reset",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);

      const result = await this.resetPasswordUC.execute(token, newPassword);

      res.json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: "PASSWORD_RESET_FAILED",
          message:
            error instanceof Error ? error.message : "Password reset failed",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
