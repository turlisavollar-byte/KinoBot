import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { ISessionRepository } from "../../../domain/repositories/ISessionRepository";
import { PasswordService } from "../../../infrastructure/services/password.service";
import { Logger } from "@/shared/utils/logger";

export class ChangePasswordUseCase {
  private readonly logger = Logger.getInstance("ChangePasswordUseCase");

  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!currentPassword || !newPassword) {
      throw new Error("Current and new passwords are required");
    }

    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const currentPasswordMatches = await this.passwordService.verify(
      currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new Error("Current password is incorrect");
    }

    if (currentPassword === newPassword) {
      throw new Error(
        "New password must be different from the current password",
      );
    }

    const newPasswordHash = await this.passwordService.hash(newPassword);
    await this.userRepo.update(user.id, { passwordHash: newPasswordHash });
    await this.sessionRepo.revokeAll(user.id);

    this.logger.info("Password changed successfully", {
      userId: user.id,
      email: user.email,
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  }
}
