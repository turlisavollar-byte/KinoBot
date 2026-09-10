import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { ISessionRepository } from "../../../domain/repositories/ISessionRepository";
import { permissionCache } from "@/shared/utils/permission-cache";

export class LogoutUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(userId: string, refreshToken: string | null): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (refreshToken) {
      // Logout current session
      await this.sessionRepo.revoke(userId, refreshToken);
    } else {
      // Logout all sessions
      await this.sessionRepo.revokeAll(userId);
    }
    permissionCache.invalidate(userId);
  }
}
