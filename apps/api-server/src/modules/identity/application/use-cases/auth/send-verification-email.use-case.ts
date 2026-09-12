import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { Logger } from "@/shared/utils/logger";
import crypto from "node:crypto";

export class SendVerificationEmailUseCase {
  private readonly logger = Logger.getInstance("SendVerificationEmailUseCase");

  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string): Promise<{ verificationToken: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with verification token
    await this.userRepo.update(userId, {
      verificationToken,
      verificationExpiresAt,
    });

    this.logger.info("Verification email token generated", {
      userId,
      email: user.email,
    });

    // In a real implementation, you would send an email here
    // For now, we'll just return the token for testing
    return { verificationToken };
  }
}
