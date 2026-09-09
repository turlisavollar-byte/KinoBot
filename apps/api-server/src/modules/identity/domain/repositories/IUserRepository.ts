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
  createdAt: Date | string;
  updatedAt: Date | string;
}>;

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
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
