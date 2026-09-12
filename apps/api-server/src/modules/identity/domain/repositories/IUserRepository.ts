import { type Role } from "@/shared/constants/roles";
import { type UserStatus } from "@/shared/constants/user-status";
import { User } from "../entities/user.entity";

export type UserUpdateInput = Partial<{
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role | string | { name?: string };
  permissions: Array<string | { name?: string }>;
  status: UserStatus | string;
  avatar: string;
  lastLoginAt: Date | string;
  lastFailedLoginAt: Date | string;
  failedLoginCount: number;
  lockedUntil: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  verificationToken: string | null;
  verificationExpiresAt: Date | string | null;
  isEmailVerified: boolean;
  resetToken: string | null;
  resetExpiresAt: Date | string | null;
}>;

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(token: string): Promise<User | null>;
  findByResetToken(token: string): Promise<User | null>;
  findAll(options?: {
    skip?: number;
    take?: number;
    status?: UserStatus;
    roleId?: string;
  }): Promise<User[]>;
  create(user: User): Promise<User>;
  update(id: string, user: UserUpdateInput): Promise<User>;
  delete(id: string): Promise<void>;
  updateRole(id: string, role: Role): Promise<User>;
  updateStatus(id: string, status: UserStatus): Promise<User>;
  count(options?: { status?: UserStatus; roleId?: string }): Promise<number>;
}
