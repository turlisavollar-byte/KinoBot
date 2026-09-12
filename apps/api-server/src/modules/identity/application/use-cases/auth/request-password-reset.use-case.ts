import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { Logger } from "@/shared/utils/logger";
import crypto from "node:crypto";

export class RequestPasswordResetUseCase {
  private readonly logger = Logger.getInstance("RequestPasswordResetUseCase");

  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string): Promise<{ resetToken: string }> {
    const user = await this.userRepo.findByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.info("Password reset requested for non-existent email", {
        email,
      });
      return { resetToken: "" };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await this.userRepo.update(user.id, {
      resetToken,
      resetExpiresAt,
    });

    this.logger.info("Password reset token generated", {
      userId: user.id,
      email: user.email,
    });

    // In a real implementation, you would send an email here
    // For now, we'll just return the token for testing
    return { resetToken };
  }
}
