// modules/user/interface/http/validators/user.validator.ts

import { z } from "zod";

// User status and role enums
const UserStatusEnum = z.enum([
  "active",
  "inactive",
  "blocked",
  "deleted",
  "suspended",
]);
const UserRoleEnum = z.enum([
  "superadmin",
  "admin",
  "manager",
  "moderator",
  "user",
  "viewer",
]);

// List users validator
export const ListUsersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  isBlocked: z.enum(["true", "false"]).optional(),
  isDeleted: z.enum(["true", "false"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z
    .enum([
      "id",
      "telegramId",
      "username",
      "firstName",
      "lastName",
      "email",
      "phone",
      "status",
      "role",
      "isActive",
      "isBlocked",
      "createdAt",
      "updatedAt",
      "lastLoginAt",
    ])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  includeDeleted: z.enum(["true", "false"]).default("false"),
});

// Update user validator
export const UpdateUserSchema = z
  .object({
    username: z.string().min(2).max(50).optional(),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    languageCode: z.string().length(2).optional(),
    isActive: z.boolean().optional(),
    status: UserStatusEnum.optional(),
    dailyCodeLimit: z.number().int().min(0).nullable().optional(),
    weeklyCodeLimit: z.number().int().min(0).nullable().optional(),
    monthlyCodeLimit: z.number().int().min(0).nullable().optional(),
    referralRewardTier: z.number().int().min(0).optional(),
    accountStatus: z.enum(["active", "blocked"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// Block user validator
export const BlockUserSchema = z.object({
  blocked: z.boolean(),
  reason: z.string().min(1).max(500).optional(),
});

// Export users validator
export const ExportUsersSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  search: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
