import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { LoginDTO, LoginResponse } from "../../dto/auth.dto";
import { PasswordService } from "../../../infrastructure/services/password.service";
import { JwtService } from "../../../infrastructure/services/jwt.service";
import { auditService } from "@/modules/audit/audit.service";
import { normalizeRoleName } from "@/shared/constants/roles";
import type { ISessionRepository } from "../../../domain/repositories/ISessionRepository";
import { Logger } from "@/shared/utils/logger";
import crypto from "node:crypto";

export class LoginUseCase {
  private readonly logger = Logger.getInstance("LoginUseCase");

  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly sessionRepo: ISessionRepository,
  ) {}

  private hashEmailForAudit(email: string): string {
    return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");
  }

  async execute(dto: LoginDTO): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      // Log failed login attempt (non-blocking)
      const emailHash = this.hashEmailForAudit(dto.email);
      auditService
        .log({
          actorType: "USER",
          action: "LOGIN_FAILED",
          targetType: "USER",
          targetId: emailHash,
          targetName: emailHash,
          metadata: {
            reason: "User not found",
            emailHash: emailHash,
          },
        })
        .catch((err) => this.logger.error("Audit log failed", { error: err }));
      throw new Error("Invalid credentials");
    }

    // Check if account is locked
    if (user.isLocked) {
      // Log failed login attempt (non-blocking)
      auditService
        .log({
          actorType: "USER",
          actorId: user.id,
          actorEmail: user.email,
          action: "LOGIN_FAILED",
          targetType: "USER",
          targetId: user.id,
          targetName: user.name,
          metadata: {
            reason: "Account locked",
            lockedUntil: user.lockedUntil,
          },
        })
        .catch((err) => this.logger.error("Audit log failed", { error: err }));
      throw new Error("Account is temporarily locked due to too many failed login attempts");
    }

    // Try bcrypt first (new passwords)
    let isValidPassword = await this.passwordService.verify(
      dto.password,
      user.passwordHash,
    );

    // Fall back to legacy SHA256 for backward compatibility
    if (!isValidPassword) {
      isValidPassword = this.passwordService.verifyLegacy(
        dto.password,
        user.passwordHash,
      );

      // If legacy hash works, migrate to bcrypt
      if (isValidPassword) {
        const newHash = await this.passwordService.hash(dto.password);
        await this.userRepo.update(user.id, { passwordHash: newHash });
      }
    }

    if (!isValidPassword) {
      // Record failed login attempt
      const updatedUser = user.recordFailedLogin();
      await this.userRepo.update(user.id, updatedUser);

      // Lock account after 5 failed attempts
      let shouldLock = false;
      if (updatedUser.failedLoginCount >= 5) {
        const lockedUser = updatedUser.lockAccount(30); // Lock for 30 minutes
        await this.userRepo.update(user.id, lockedUser);
        shouldLock = true;
      }

      // Log failed login attempt (non-blocking)
      auditService
        .log({
          actorType: "USER",
          actorId: user.id,
          actorEmail: user.email,
          action: "LOGIN_FAILED",
          targetType: "USER",
          targetId: user.id,
          targetName: user.name,
          metadata: {
            reason: "Invalid password",
            failedLoginCount: updatedUser.failedLoginCount,
            locked: shouldLock,
          },
        })
        .catch((err) => this.logger.error("Audit log failed", { error: err }));

      if (shouldLock) {
        throw new Error("Account temporarily locked due to too many failed login attempts");
      }
      throw new Error("Invalid credentials");
    }

    // Check if user is active
    if (!user.isActive) {
      // Log failed login attempt (non-blocking)
      auditService
        .log({
          actorType: "USER",
          actorId: user.id,
          actorEmail: user.email,
          action: "LOGIN_FAILED",
          targetType: "USER",
          targetId: user.id,
          targetName: user.name,
          metadata: {
            reason: "Account not active",
            status: user.status,
          },
        })
        .catch((err) => this.logger.error("Audit log failed", { error: err }));
      throw new Error("Account is not active");
    }

    // Update last login
    const updatedUser = user.updateLastLogin();
    await this.userRepo.update(user.id, updatedUser);

    // Log successful login (non-blocking)
    auditService
      .log({
        actorType: "USER",
        actorId: user.id,
        actorEmail: user.email,
        action: "LOGIN",
        targetType: "USER",
        targetId: user.id,
        targetName: user.name,
        metadata: {
          role: user.role.name,
        },
      })
      .catch((err) => this.logger.error("Audit log failed", { error: err }));

    const jwtService = JwtService.getInstance();
    const accessToken = jwtService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.permissions.map((p) => p.name),
    });
    const refreshToken = jwtService.generateRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.permissions.map((p) => p.name),
    });

    // Extract request metadata if available (will be passed from controller)
    const sessionMetadata = (dto as any).sessionMetadata || {};

    await this.sessionRepo.create(
      user.id,
      refreshToken,
      new Date(Date.now() + 604800 * 1000),
      sessionMetadata,
    );
    const expiresIn = 3600; // 1 hour

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: normalizeRoleName(user.role.name),
        permissions: user.permissions.map((p) => p.name),
      },
      accessToken,
      refreshToken,
      expiresIn,
    };
  }
}
