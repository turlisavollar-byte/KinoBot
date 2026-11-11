import {
  db,
  adminUsersTable,
  adminSessionsTable,
  rolesTable,
} from "@workspace/db";
import { and, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import type { UserAccessScope } from "@/shared/constants/user-access";
import { randomUUID } from "node:crypto";

export interface AdminUserListOptions {
  search?: string;
  page: number;
  pageSize: number;
  scope?: UserAccessScope;
}

export interface AdminUserUpdateData {
  name?: string;
  email?: string;
  role?: string;
  roleId?: string;
}

export class AdminUsersRepository {
  async emailExists(email: string): Promise<boolean> {
    const [existing] = await db
      .select({ id: adminUsersTable.id })
      .from(adminUsersTable)
      .where(
        and(
          eq(adminUsersTable.email, email),
          isNull(adminUsersTable.deletedAt),
        ),
      )
      .limit(1);

    return Boolean(existing);
  }

  async createAdmin(input: {
    email: string;
    role: "admin" | "moderator";
    passwordHash: string;
    roleId: string;
  }) {
    const [created] = await db
      .insert(adminUsersTable)
      .values({
        id: randomUUID(),
        email: input.email,
        name: null,
        role: input.role,
        roleId: input.roleId,
        passwordHash: input.passwordHash,
        isActive: true,
        mustChangePassword: true,
        isEmailVerified: true,
      })
      .returning({
        id: adminUsersTable.id,
        email: adminUsersTable.email,
        name: adminUsersTable.name,
        role: adminUsersTable.role,
        isActive: adminUsersTable.isActive,
        lastLoginAt: adminUsersTable.lastLoginAt,
        createdAt: adminUsersTable.createdAt,
        updatedAt: adminUsersTable.updatedAt,
        mustChangePassword: adminUsersTable.mustChangePassword,
      });

    if (!created) throw new Error("Failed to create administrative account");
    return created;
  }

  async list(options: AdminUserListOptions) {
    const conditions = [isNull(adminUsersTable.deletedAt)];

    if (options.search) {
      const searchTerm = `%${options.search.toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`LOWER(${adminUsersTable.name})`, searchTerm),
          like(sql`LOWER(${adminUsersTable.email})`, searchTerm),
          like(sql`LOWER(${adminUsersTable.role})`, searchTerm),
        )!,
      );
    }

    if (options.scope?.selfOnly && options.scope.includeId) {
      conditions.push(eq(adminUsersTable.id, options.scope.includeId));
    } else if (options.scope?.roles?.length && options.scope.includeId) {
      conditions.push(
        or(
          eq(adminUsersTable.id, options.scope.includeId),
          inArray(
            sql<string>`coalesce(${rolesTable.name}, ${adminUsersTable.role})`,
            options.scope.roles,
          ),
        )!,
      );
    } else if (options.scope?.roles?.length) {
      conditions.push(
        inArray(
          sql<string>`coalesce(${rolesTable.name}, ${adminUsersTable.role})`,
          options.scope.roles,
        ),
      );
    }

    const whereClause = and(...conditions);
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(adminUsersTable)
      .leftJoin(rolesTable, eq(adminUsersTable.roleId, rolesTable.id))
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    const users = await db
      .select({
        id: adminUsersTable.id,
        email: adminUsersTable.email,
        name: adminUsersTable.name,
        role: sql<string>`coalesce(${rolesTable.name}, ${adminUsersTable.role})`,
        isActive: adminUsersTable.isActive,
        lastLoginAt: adminUsersTable.lastLoginAt,
        createdAt: adminUsersTable.createdAt,
        updatedAt: adminUsersTable.updatedAt,
      })
      .from(adminUsersTable)
      .leftJoin(rolesTable, eq(adminUsersTable.roleId, rolesTable.id))
      .where(whereClause)
      .orderBy(desc(adminUsersTable.createdAt))
      .limit(options.pageSize)
      .offset((options.page - 1) * options.pageSize);

    return { users, total };
  }

  async findById(id: string) {
    const [user] = await db
      .select({
        id: adminUsersTable.id,
        role: adminUsersTable.role,
        roleId: adminUsersTable.roleId,
      })
      .from(adminUsersTable)
      .where(and(eq(adminUsersTable.id, id), isNull(adminUsersTable.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  async findSafeById(id: string) {
    const [user] = await db
      .select({
        id: adminUsersTable.id,
        email: adminUsersTable.email,
        name: adminUsersTable.name,
        role: sql<string>`coalesce(${rolesTable.name}, ${adminUsersTable.role})`,
        isActive: adminUsersTable.isActive,
        lastLoginAt: adminUsersTable.lastLoginAt,
        createdAt: adminUsersTable.createdAt,
        updatedAt: adminUsersTable.updatedAt,
      })
      .from(adminUsersTable)
      .leftJoin(rolesTable, eq(adminUsersTable.roleId, rolesTable.id))
      .where(and(eq(adminUsersTable.id, id), isNull(adminUsersTable.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  async findRoleId(role: string): Promise<string | null> {
    const [row] = await db
      .select({ id: rolesTable.id })
      .from(rolesTable)
      .where(eq(rolesTable.name, role))
      .limit(1);

    return row?.id ?? null;
  }

  async update(id: string, data: AdminUserUpdateData) {
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(adminUsersTable)
        .set(data)
        .where(eq(adminUsersTable.id, id))
        .returning({ id: adminUsersTable.id });

      if (updated && data.role !== undefined) {
        await tx
          .update(adminSessionsTable)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(adminSessionsTable.adminId, id),
              isNull(adminSessionsTable.revokedAt),
            ),
          );
      }

      return updated ?? null;
    });
  }

  async softDelete(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(adminUsersTable)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(adminUsersTable.id, id));

      await tx
        .update(adminSessionsTable)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(adminSessionsTable.adminId, id),
            isNull(adminSessionsTable.revokedAt),
          ),
        );
    });
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(adminUsersTable)
        .set({ isActive })
        .where(eq(adminUsersTable.id, id));

      if (!isActive) {
        await tx
          .update(adminSessionsTable)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(adminSessionsTable.adminId, id),
              isNull(adminSessionsTable.revokedAt),
            ),
          );
      }
    });
  }
}
