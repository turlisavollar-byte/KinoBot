// modules/user/infrastructure/repositories/drizzle-user.repository.ts

import { injectable } from "tsyringe";
import {
  and,
  eq,
  or,
  ilike,
  count,
  sql,
  desc,
  asc,
  inArray,
} from "drizzle-orm";
import {
  db,
  usersTable,
  userProfilesTable,
  userStatsTable,
} from "@workspace/db";
import {
  IUserRepository,
  UserFilters,
  UserPaginationResult,
  UserStats,
  UserStatus,
  UserRole,
} from "../../domain/repositories/user.repository.interface";
import { User } from "../../domain/entities/user.entity";
import {
  UserStatusVO,
  UserRoleVO,
} from "../../domain/value-objects/user-status.vo";
import { Email } from "../../domain/value-objects/email.vo";
import { Phone } from "../../domain/value-objects/phone.vo";
import { Logger } from "@/shared/utils/logger";

type DbUser = typeof usersTable.$inferSelect;

@injectable()
export class DrizzleUserRepository implements IUserRepository {
  private readonly logger = Logger.getInstance("DrizzleUserRepository");

  private toDomain(row: DbUser): User {
    return User.reconstitute({
      id: row.id,
      telegramId: row.telegramId,
      email: row.email ? Email.create(row.email) : undefined,
      phone: row.phone ? Phone.create(row.phone) : undefined,
      username: row.username || undefined,
      firstName: row.firstName || undefined,
      lastName: row.lastName || undefined,
      languageCode: row.languageCode || "en",
      status: UserStatusVO.fromString(String(row.status ?? "active")),
      role: UserRoleVO.fromString(String(row.role ?? "user")),
      isActive: row.isActive ?? true,
      isBlocked: row.isBlocked ?? false,
      blockedReason: row.blockedReason || undefined,
      lastLoginAt: row.lastLoginAt || undefined,
      referralCode: row.referralCode || undefined,
      referredBy: row.referredBy || undefined,
      referralRewardTier: row.referralRewardTier ?? 0,
      acquisitionSource: row.acquisitionSource || undefined,
      dailyCodeLimit: row.dailyCodeLimit,
      dailyCodeUsed: row.dailyCodeUsed ?? 0,
      dailyCodeResetAt: row.dailyCodeResetAt,
      weeklyCodeLimit: row.weeklyCodeLimit,
      weeklyCodeUsed: row.weeklyCodeUsed ?? 0,
      weeklyCodeResetAt: row.weeklyCodeResetAt,
      monthlyCodeLimit: row.monthlyCodeLimit,
      monthlyCodeUsed: row.monthlyCodeUsed ?? 0,
      monthlyCodeResetAt: row.monthlyCodeResetAt,
      trialExpiresAt: row.trialExpiresAt || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt || row.createdAt,
      deletedAt: row.deletedAt || undefined,
    });
  }

  private toDb(user: User): Partial<DbUser> {
    return {
      id: user.id,
      telegramId: user.telegramId,
      email: user.email?.toString(),
      phone: user.phone?.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      languageCode: user.languageCode,
      status: user.status.toString(),
      role: user.role.toString(),
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      blockedReason: user.blockedReason,
      lastLoginAt: user.lastLoginAt,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      referralRewardTier: user.referralRewardTier,
      acquisitionSource: user.acquisitionSource,
      dailyCodeLimit: user.dailyCodeLimit,
      dailyCodeUsed: user.dailyCodeUsed,
      weeklyCodeLimit: user.weeklyCodeLimit,
      weeklyCodeUsed: user.weeklyCodeUsed,
      weeklyCodeResetAt: user.toJSON().weeklyCodeResetAt,
      monthlyCodeLimit: user.monthlyCodeLimit,
      monthlyCodeUsed: user.monthlyCodeUsed,
      monthlyCodeResetAt: user.toJSON().monthlyCodeResetAt,
      trialExpiresAt: user.trialExpiresAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.isDeleted ? new Date() : undefined,
    };
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    const [row] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const [row] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, phone))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findMany(filters: UserFilters): Promise<UserPaginationResult> {
    const {
      search,
      status,
      role,
      isActive,
      isBlocked,
      isDeleted,
      telegramId,
      email,
      phone,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
      includeDeleted = false,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions = [];

    // Search
    if (search) {
      conditions.push(
        or(
          ilike(usersTable.username, `%${search}%`),
          ilike(usersTable.firstName, `%${search}%`),
          ilike(usersTable.lastName, `%${search}%`),
          ilike(usersTable.telegramId, `%${search}%`),
          ilike(usersTable.email, `%${search}%`),
        ),
      );
    }

    // Filters
    if (status && status.length > 0) {
      conditions.push(inArray(usersTable.status, status));
    }

    if (role && role.length > 0) {
      conditions.push(inArray(usersTable.role, role));
    }

    if (isActive !== undefined) {
      conditions.push(eq(usersTable.isActive, isActive));
    }

    if (isBlocked !== undefined) {
      conditions.push(eq(usersTable.isBlocked, isBlocked));
    }

    if (isDeleted !== undefined && !includeDeleted) {
      conditions.push(
        isDeleted
          ? sql`${usersTable.deletedAt} IS NOT NULL`
          : sql`${usersTable.deletedAt} IS NULL`,
      );
    }

    if (telegramId) {
      conditions.push(eq(usersTable.telegramId, telegramId));
    }

    if (email) {
      conditions.push(eq(usersTable.email, email));
    }

    if (phone) {
      conditions.push(eq(usersTable.phone, phone));
    }

    if (startDate) {
      conditions.push(sql`${usersTable.createdAt} >= ${startDate}`);
    }

    if (endDate) {
      conditions.push(sql`${usersTable.createdAt} <= ${endDate}`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(where);

    // Get data
    let sortColumn;
    switch (sortBy) {
      case "id":
        sortColumn = usersTable.id;
        break;
      case "telegramId":
        sortColumn = usersTable.telegramId;
        break;
      case "username":
        sortColumn = usersTable.username;
        break;
      case "firstName":
        sortColumn = usersTable.firstName;
        break;
      case "lastName":
        sortColumn = usersTable.lastName;
        break;
      case "email":
        sortColumn = usersTable.email;
        break;
      case "phone":
        sortColumn = usersTable.phone;
        break;
      case "status":
        sortColumn = usersTable.status;
        break;
      case "role":
        sortColumn = usersTable.role;
        break;
      case "isActive":
        sortColumn = usersTable.isActive;
        break;
      case "isBlocked":
        sortColumn = usersTable.isBlocked;
        break;
      case "updatedAt":
        sortColumn = usersTable.updatedAt;
        break;
      default:
        sortColumn = usersTable.createdAt;
    }

    const orderBy = sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

    const rows = await db
      .select()
      .from(usersTable)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const data = rows.map((row) => this.toDomain(row));
    const totalPages = Math.ceil(Number(total) / limit);

    return {
      data,
      meta: {
        total: Number(total),
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async findAll(filters?: Partial<UserFilters>): Promise<User[]> {
    const result = await this.findMany({
      ...filters,
      page: 1,
      limit: 10000,
    });
    return result.data;
  }

  async create(user: User): Promise<User> {
    const dbData = this.toDb(user);
    const [row] = await db
      .insert(usersTable)
      .values({
        telegramId: dbData.telegramId!,
        ...dbData,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create user");
    }

    return this.toDomain(row);
  }

  async update(user: User): Promise<User> {
    const updateData = this.toDb(user);
    delete updateData.id;
    delete updateData.createdAt;

    const [row] = await db
      .update(usersTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    if (!row) {
      throw new Error(`Failed to update user with id ${user.id}`);
    }

    return this.toDomain(row);
  }

  async delete(id: string, soft: boolean = true): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    if (soft) {
      user.softDelete();
      return this.update(user);
    }

    const [row] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning();

    return row ? this.toDomain(row) : null;
  }

  async restore(id: string): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    user.restore();
    return this.update(user);
  }

  async bulkCreate(users: User[]): Promise<User[]> {
    const rows = await db
      .insert(usersTable)
      .values(
        users.map((u) => {
          const dbData = this.toDb(u);
          return {
            telegramId: dbData.telegramId!,
            ...dbData,
          };
        }),
      )
      .returning();

    return rows.map((row) => this.toDomain(row));
  }

  async bulkUpdate(users: User[]): Promise<User[]> {
    const results: User[] = [];

    for (const user of users) {
      try {
        const updated = await this.update(user);
        results.push(updated);
      } catch (error) {
        this.logger.error("Failed to update user in bulk", {
          id: user.id,
          error,
        });
      }
    }

    return results;
  }

  async bulkDelete(ids: string[], soft: boolean = true): Promise<number> {
    if (soft) {
      const rows = await db
        .update(usersTable)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
          isActive: false,
          status: "deleted",
        })
        .where(inArray(usersTable.id, ids))
        .returning({ id: usersTable.id });

      return rows.length;
    }

    const rows = await db
      .delete(usersTable)
      .where(inArray(usersTable.id, ids))
      .returning({ id: usersTable.id });

    return rows.length;
  }

  async getStats(filters?: UserFilters): Promise<UserStats> {
    const { status, role, startDate, endDate } = filters || {};

    const conditions = [];
    if (status && status.length > 0) {
      conditions.push(inArray(usersTable.status, status));
    }
    if (role && role.length > 0) {
      conditions.push(inArray(usersTable.role, role));
    }
    if (startDate) {
      conditions.push(sql`${usersTable.createdAt} >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`${usersTable.createdAt} <= ${endDate}`);
    }
    conditions.push(sql`${usersTable.deletedAt} IS NULL`);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(where);

    // By status
    const byStatusRows = await db
      .select({
        status: usersTable.status,
        count: count(),
      })
      .from(usersTable)
      .where(where)
      .groupBy(usersTable.status);

    // By role
    const byRoleRows = await db
      .select({
        role: usersTable.role,
        count: count(),
      })
      .from(usersTable)
      .where(where)
      .groupBy(usersTable.role);

    // Active count
    const [{ value: active }] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(and(where, eq(usersTable.isActive, true)));

    // Blocked count
    const [{ value: blocked }] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(and(where, eq(usersTable.isBlocked, true)));

    // New today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [{ value: newToday }] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(and(where, sql`${usersTable.createdAt} >= ${today}`));

    // New this week
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const [{ value: newThisWeek }] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(and(where, sql`${usersTable.createdAt} >= ${weekStart}`));

    // New this month
    const monthStart = new Date(today);
    monthStart.setMonth(monthStart.getMonth() - 1);
    const [{ value: newThisMonth }] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(and(where, sql`${usersTable.createdAt} >= ${monthStart}`));

    const byStatus = byStatusRows.reduce(
      (acc, row) => {
        acc[row.status as UserStatus] = Number(row.count);
        return acc;
      },
      {} as Record<UserStatus, number>,
    );

    const byRole = byRoleRows.reduce(
      (acc, row) => {
        acc[row.role as UserRole] = Number(row.count);
        return acc;
      },
      {} as Record<UserRole, number>,
    );

    return {
      total: Number(total),
      byStatus,
      byRole,
      active: Number(active),
      blocked: Number(blocked),
      newToday: Number(newToday),
      newThisWeek: Number(newThisWeek),
      newThisMonth: Number(newThisMonth),
    };
  }

  async exists(id: string): Promise<boolean> {
    const [{ value: exists }] = await db
      .select({ value: sql<number>`1` })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    return !!exists;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const [{ value: exists }] = await db
      .select({ value: sql<number>`1` })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    return !!exists;
  }

  async existsByTelegramId(telegramId: string): Promise<boolean> {
    const [{ value: exists }] = await db
      .select({ value: sql<number>`1` })
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);

    return !!exists;
  }

  async count(filters?: UserFilters): Promise<number> {
    const result = await this.findMany({
      ...filters,
      page: 1,
      limit: 1,
    });
    return result.meta.total;
  }
}
