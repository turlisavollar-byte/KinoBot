// modules/user/domain/repositories/user.repository.interface.ts

import { User } from "../entities/user.entity";

export type UserStatus =
  "active" | "inactive" | "blocked" | "deleted" | "suspended";
export type UserRole =
  "superadmin" | "admin" | "manager" | "moderator" | "user" | "viewer";

export interface UserFilters {
  search?: string;
  status?: UserStatus[];
  role?: UserRole[];
  isActive?: boolean;
  isBlocked?: boolean;
  isDeleted?: boolean;
  telegramId?: string;
  email?: string;
  phone?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?:
    | "id"
    | "telegramId"
    | "username"
    | "firstName"
    | "lastName"
    | "email"
    | "phone"
    | "status"
    | "role"
    | "isActive"
    | "isBlocked"
    | "createdAt"
    | "updatedAt"
    | "lastLoginAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

export interface UserPaginationResult {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface UserStats {
  total: number;
  byStatus: Record<UserStatus, number>;
  byRole: Record<UserRole, number>;
  active: number;
  blocked: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
}

export interface IUserRepository {
  // CRUD
  findById(id: string): Promise<User | null>;
  findByTelegramId(telegramId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;

  findMany(filters: UserFilters): Promise<UserPaginationResult>;
  findAll(filters?: Partial<UserFilters>): Promise<User[]>;

  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string, soft?: boolean): Promise<User | null>;
  restore(id: string): Promise<User | null>;

  // Bulk operations
  bulkCreate(users: User[]): Promise<User[]>;
  bulkUpdate(users: User[]): Promise<User[]>;
  bulkDelete(ids: string[], soft?: boolean): Promise<number>;

  // Statistics
  getStats(filters?: UserFilters): Promise<UserStats>;

  // Exists
  exists(id: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  existsByTelegramId(telegramId: string): Promise<boolean>;

  // Count
  count(filters?: UserFilters): Promise<number>;
}

// Export all types
export type {
  UserFilters as UserFiltersType,
  UserPaginationResult as UserPaginationResultType,
  UserStats as UserStatsType,
};
