import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { LoginDTO, LoginResponse } from "../../dto/auth.dto";
import { PasswordService } from "../../../infrastructure/services/password.service";
import { JwtService } from "../../../infrastructure/services/jwt.service";
import { auditService } from "@/modules/audit/audit.service";
import { normalizeRoleName } from "@/shared/constants/roles";
import type { ISessionRepository } from "../../../domain/repositories/ISessionRepository";

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(dto: LoginDTO): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      // Log failed login attempt (non-blocking)
      auditService
        .log({
          actorType: "USER",
          action: "LOGIN_FAILED",
          targetType: "USER",
          targetId: dto.email,
          targetName: dto.email,
          metadata: {
            reason: "User not found",
            email: dto.email,
          },
        })
        .catch((err) => console.error("Audit log failed:", err));
      throw new Error("Invalid credentials");
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
          },
        })
        .catch((err) => console.error("Audit log failed:", err));
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
        .catch((err) => console.error("Audit log failed:", err));
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
      .catch((err) => console.error("Audit log failed:", err));

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
    await this.sessionRepo.create(
      user.id,
      refreshToken,
      new Date(Date.now() + 604800 * 1000),
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
