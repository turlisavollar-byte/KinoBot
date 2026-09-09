import type { Role } from "@/shared/constants/roles";
import type { UserStatus } from "@/shared/constants/user-status";

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  roleId?: string;
  role?: Role;
}

export interface UpdateUserDTO {
  email?: string;
  name?: string;
  avatar?: string;
  status?: UserStatus;
  role?: Role;
}

export interface ListUsersDTO {
  skip?: number;
  take?: number;
  status?: UserStatus;
  roleId?: string;
  search?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: {
    id: string;
    name: Role;
    level: number;
  };
  permissions: string[];
  status: UserStatus;
  avatar?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersResponse {
  users: UserResponse[];
  total: number;
  skip: number;
  take: number;
}
