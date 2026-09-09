import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { ISessionRepository } from "../../../domain/repositories/ISessionRepository";
import { permissionCache } from "@/shared/utils/permission-cache";

export class LogoutUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(userId: string, refreshToken: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    await this.sessionRepo.revoke(userId, refreshToken);
    permissionCache.invalidate(userId);
  }
}
