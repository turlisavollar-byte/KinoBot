import type { Role } from "@/shared/constants/roles";
import type { UserStatus } from "@/shared/constants/user-status";

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
  role?: Role;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    permissions: string[];
    status?: UserStatus;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    status: UserStatus;
  };
}
