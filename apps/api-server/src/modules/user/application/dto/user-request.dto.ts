// modules/user/application/dto/user-request.dto.ts

import { z } from "zod";
import { RoleValues } from "@/shared/constants/roles";
import { UserStatusValues } from "@/shared/constants/user-status";

// Base user schema
export const userBaseSchema = {
  telegramId: z.string().min(1, "Telegram ID is required"),
  username: z.string().min(3).max(50).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  languageCode: z.string().length(2).optional().default("en"),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  role: z.enum(RoleValues).optional(),
  avatar: z.string().url().optional(),
};

// Create user DTO
export const createUserSchema = z.object({
  ...userBaseSchema,
  telegramId: z.string().min(1, "Telegram ID is required"),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

// Update user DTO
export const updateUserSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  languageCode: z.string().length(2).optional(),
  isActive: z.boolean().optional(),
  status: z.enum(UserStatusValues).optional(),
  role: z.enum(RoleValues).optional(),
  dailyCodeLimit: z.number().int().min(0).nullable().optional(),
  weeklyCodeLimit: z.number().int().min(0).nullable().optional(),
  monthlyCodeLimit: z.number().int().min(0).nullable().optional(),
  referralRewardTier: z.number().int().min(0).optional(),
  accountStatus: z.enum(["active", "blocked"]).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

// Block user DTO
export const blockUserSchema = z.object({
  blocked: z.boolean(),
  reason: z.string().max(500).optional(),
});

export type BlockUserDto = z.infer<typeof blockUserSchema>;

const optionalBooleanQuery = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  return value === "true";
}, z.boolean().optional());

// List users filter DTO
export const listUsersFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(), // Comma-separated values
  role: z.string().optional(), // Comma-separated values
  isActive: optionalBooleanQuery,
  isBlocked: optionalBooleanQuery,
  isDeleted: optionalBooleanQuery,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "lastLoginAt", "username"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  includeDeleted: optionalBooleanQuery,
});

export type ListUsersFilterDto = z.infer<typeof listUsersFilterSchema>;

// Export users DTO
export const exportUsersSchema = z.object({
  format: z.enum(["json", "csv", "xlsx"]).optional().default("json"),
  filters: listUsersFilterSchema.optional(),
});

export type ExportUsersDto = z.infer<typeof exportUsersSchema>;
