import { db, adminUsersTable, rolesTable } from "@workspace/db";
import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";

export interface AdminUserListOptions {
  search?: string;
  page: number;
  pageSize: number;
}

export interface AdminUserUpdateData {
  name?: string;
  email?: string;
  role?: string;
  roleId?: string;
}

export class AdminUsersRepository {
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

    const whereClause = and(...conditions);
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(adminUsersTable)
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

  async findRoleId(role: string): Promise<string | null> {
    const [row] = await db
      .select({ id: rolesTable.id })
      .from(rolesTable)
      .where(eq(rolesTable.name, role))
      .limit(1);

    return row?.id ?? null;
  }

  async update(id: string, data: AdminUserUpdateData) {
    const [updated] = await db
      .update(adminUsersTable)
      .set(data)
      .where(eq(adminUsersTable.id, id))
      .returning({ id: adminUsersTable.id });

    return updated ?? null;
  }

  async softDelete(id: string): Promise<void> {
    await db
      .update(adminUsersTable)
      .set({ deletedAt: new Date(), isActive: false })
      .where(eq(adminUsersTable.id, id));
  }
}
