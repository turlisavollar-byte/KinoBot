import type { Role } from "@/shared/constants/roles";
import type { UserStatus } from "@/shared/constants/user-status";
import { z } from "zod/v4";

// Zod schemas for runtime validation
export const loginSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
  role: z.enum(["user", "admin", "superadmin"]).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// TypeScript interfaces (for type safety)
export interface LoginDTO {
  email: string;
  password: string;
  sessionMetadata?: {
    device?: string;
    ip?: string;
    userAgent?: string;
    sessionName?: string;
  };
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
