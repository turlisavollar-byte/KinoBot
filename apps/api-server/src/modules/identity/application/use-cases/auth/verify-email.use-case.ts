import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { Logger } from "@/shared/utils/logger";

export class VerifyEmailUseCase {
  private readonly logger = Logger.getInstance("VerifyEmailUseCase");

  constructor(private readonly userRepo: IUserRepository) {}

  async execute(token: string): Promise<{ success: boolean; message: string }> {
    // Find user by verification token
    const user = await this.userRepo.findByVerificationToken(token);
    if (!user) {
      throw new Error("Invalid or expired verification token");
    }

    // Check if token is expired
    if (user.verificationExpiresAt && user.verificationExpiresAt < new Date()) {
      throw new Error("Verification token has expired");
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return {
        success: true,
        message: "Email already verified",
      };
    }

    // Mark email as verified
    await this.userRepo.update(user.id, {
      isEmailVerified: true,
      verificationToken: undefined,
      verificationExpiresAt: undefined,
    });

    this.logger.info("Email verified successfully", {
      userId: user.id,
      email: user.email,
    });

    return {
      success: true,
      message: "Email verified successfully",
    };
  }
}
