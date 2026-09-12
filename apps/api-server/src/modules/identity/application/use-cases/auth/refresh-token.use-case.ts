import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { RefreshTokenDTO, LoginResponse } from "../../dto/auth.dto";
import { JwtService } from "../../../infrastructure/services/jwt.service";
import { normalizeRoleName } from "@/shared/constants/roles";
import type { ISessionRepository } from "../../../domain/repositories/ISessionRepository";

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(dto: RefreshTokenDTO): Promise<LoginResponse> {
    const jwtService = JwtService.getInstance();
    const decoded = await jwtService.verify(dto.refreshToken, "refresh");

    const user = await this.userRepo.findById(decoded.sub);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isActive) {
      throw new Error("Account is not active");
    }

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

    // Atomic token rotation to prevent race conditions
    await this.sessionRepo.rotate(
      user.id,
      dto.refreshToken,
      refreshToken,
      new Date(Date.now() + 604800 * 1000),
    );

    const expiresIn = 3600;

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
