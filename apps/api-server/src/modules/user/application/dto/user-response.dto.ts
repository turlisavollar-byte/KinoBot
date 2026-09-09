// modules/user/application/dto/user-response.dto.ts

import { z } from "zod";

// User response schema
export const userResponseSchema = z.object({
  id: z.string(),
  telegramId: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  fullName: z.string(),
  languageCode: z.string(),
  status: z.enum(["active", "inactive", "blocked", "deleted", "suspended"]),
  role: z.enum([
    "superadmin",
    "admin",
    "manager",
    "moderator",
    "user",
    "viewer",
  ]),
  isActive: z.boolean(),
  isBlocked: z.boolean(),
  blockedReason: z.string().nullable().optional(),
  lastLoginAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserResponseDto = z.infer<typeof userResponseSchema>;

// User list response schema
export const userListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(userResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
  timestamp: z.string().datetime(),
});

export type UserListResponseDto = z.infer<typeof userListResponseSchema>;

// User stats response schema
export const userStatsResponseSchema = z.object({
  total: z.number(),
  byStatus: z.record(
    z.enum(["active", "inactive", "blocked", "deleted", "suspended"]),
    z.number(),
  ),
  byRole: z.record(
    z.enum(["superadmin", "admin", "manager", "moderator", "user", "viewer"]),
    z.number(),
  ),
  active: z.number(),
  blocked: z.number(),
  newToday: z.number(),
  newThisWeek: z.number(),
  newThisMonth: z.number(),
});

export type UserStatsResponseDto = z.infer<typeof userStatsResponseSchema>;

// Success response schema
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string().datetime(),
});

export type SuccessResponseDto = z.infer<typeof successResponseSchema>;

// User with data response schema
export const userWithDataResponseSchema = z.object({
  success: z.boolean(),
  data: userResponseSchema,
  message: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type UserWithDataResponseDto = z.infer<
  typeof userWithDataResponseSchema
>;
