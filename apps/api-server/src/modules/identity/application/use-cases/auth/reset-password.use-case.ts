import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { ISessionRepository } from "../../../domain/repositories/ISessionRepository";
import { PasswordService } from "../../../infrastructure/services/password.service";
import { Logger } from "@/shared/utils/logger";

export class ResetPasswordUseCase {
  private readonly logger = Logger.getInstance("ResetPasswordUseCase");

  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    // Find user by reset token
    const user = await this.userRepo.findByResetToken(token);
    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Check if token is expired
    if (user.resetExpiresAt && user.resetExpiresAt < new Date()) {
      throw new Error("Reset token has expired");
    }

    // Validate password strength
    const passwordValidation =
      this.passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(
        `Password requirements not met: ${passwordValidation.errors.join(", ")}`,
      );
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hash(newPassword);

    // Update user password and clear reset token
    await this.userRepo.update(user.id, {
      passwordHash: newPasswordHash,
      resetToken: null,
      resetExpiresAt: null,
    });
    await this.sessionRepo.revokeAll(user.id);

    this.logger.info("Password reset successfully", {
      userId: user.id,
      email: user.email,
    });

    return {
      success: true,
      message: "Password reset successfully",
    };
  }
}
