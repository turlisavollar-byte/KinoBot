import { normalizeRoleName } from "@/shared/constants/roles";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository";
import type { IRoleRepository } from "../../../domain/repositories/IRoleRepository";
import { User } from "../../../domain/entities/user.entity";
import { PasswordService } from "../../../infrastructure/services/password.service";
import type { RegisterDTO, RegisterResponse } from "../../dto/auth.dto";

export class RegisterUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly roleRepo: IRoleRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(dto: RegisterDTO): Promise<RegisterResponse> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    if (!email || !name || !dto.password) {
      throw new Error("Email, name, and password are required");
    }

    if (!this.passwordService.validatePasswordStrength(dto.password).isValid) {
      throw new Error("Password does not meet security requirements");
    }

    if (await this.userRepo.findByEmail(email)) {
      throw new Error("An account with this email already exists");
    }

    const role = await this.roleRepo.findByName("user");
    if (!role) {
      throw new Error("Default user role is not configured");
    }

    const user = User.create({
      email,
      name,
      passwordHash: await this.passwordService.hash(dto.password),
      role,
      status: "active",
    });
    const created = await this.userRepo.create(user);

    return {
      user: {
        id: created.id,
        email: created.email,
        name: created.name,
        role: normalizeRoleName(created.role.name),
        status: created.status,
      },
    };
  }
}
