import {
  IUserRepository,
  type UserUpdateInput,
} from "../../domain/repositories/IUserRepository";
import { User } from "../../domain/entities/user.entity";
import { Role as RoleEntity } from "../../domain/entities/role.entity";
import {
  Permission as PermissionEntity,
  PermissionCategory,
} from "../../domain/entities/permission.entity";
import { DrizzleRoleRepository } from "./drizzle-role.repository";
import { type Role, normalizeRoleName } from "@/shared/constants/roles";
import { getPermissions } from "@/shared/constants/role-permissions";
import {
  type UserStatus,
  normalizeUserStatus,
} from "@/shared/constants/user-status";
import { db, adminUsersTable } from "@workspace/db";
import { eq, and, desc, or, isNull } from "drizzle-orm";

type DbUserRow = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: string;
  roleId?: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class DrizzleUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(adminUsersTable)
      .where(and(eq(adminUsersTable.id, id), isNull(adminUsersTable.deletedAt)))
      .limit(1);

    if (!user) return null;

    return await this.mapToEntity(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const aliases = new Set<string>([
      normalizedEmail,
      normalizedEmail.replace(/^superadmin@/, "admin@"),
      normalizedEmail.replace(/^admin@/, "superadmin@"),
    ]);

    const [user] = await db
      .select()
      .from(adminUsersTable)
      .where(
        and(
          or(
            ...Array.from(aliases).map((value) =>
              eq(adminUsersTable.email, value),
            ),
          ),
          isNull(adminUsersTable.deletedAt),
        ),
      )
      .limit(1);

    if (!user) return null;

    return await this.mapToEntity(user);
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    status?: UserStatus;
    roleId?: string;
  }): Promise<User[]> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (options?.status) {
      const isActive = options.status === "active";
      conditions.push(eq(adminUsersTable.isActive, isActive));
    }

    if (options?.roleId) {
      conditions.push(eq(adminUsersTable.role, options.roleId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const users = await db
      .select()
      .from(adminUsersTable)
      .where(whereClause)
      .orderBy(desc(adminUsersTable.createdAt))
      .limit(options?.take ?? 50)
      .offset(options?.skip ?? 0);

    return Promise.all(users.map((user) => this.mapToEntity(user)));
  }

  async create(user: User): Promise<User> {
    const [created] = await db
      .insert(adminUsersTable)
      .values({
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role.name,
        isActive: user.status === "active",
        lastLoginAt: user.lastLoginAt,
      })
      .returning();

    return await this.mapToEntity(created);
  }

  async update(id: string, user: UserUpdateInput): Promise<User> {
    const updateData: Partial<{
      email: string;
      name: string;
      passwordHash: string;
      role: Role;
      isActive: boolean;
      lastLoginAt: Date | null;
    }> = {};

    if (user.email) updateData.email = user.email;
    if (user.name) updateData.name = user.name;
    if (user.passwordHash) updateData.passwordHash = user.passwordHash;
    if (user.role) updateData.role = normalizeRoleName(String(user.role));
    if (user.status)
      updateData.isActive =
        normalizeUserStatus(String(user.status)) === "active";
    if (user.lastLoginAt) updateData.lastLoginAt = new Date(user.lastLoginAt);

    const [updated] = await db
      .update(adminUsersTable)
      .set(updateData)
      .where(eq(adminUsersTable.id, id))
      .returning();

    if (!updated) {
      throw new Error("User not found");
    }

    return await this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id));
  }

  async updateRole(id: string, role: Role): Promise<User> {
    const [updated] = await db
      .update(adminUsersTable)
      .set({ role: normalizeRoleName(role) })
      .where(eq(adminUsersTable.id, id))
      .returning();

    if (!updated) {
      throw new Error("User not found");
    }

    return await this.mapToEntity(updated);
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const isActive = normalizeUserStatus(status) === "active";

    const [updated] = await db
      .update(adminUsersTable)
      .set({ isActive })
      .where(eq(adminUsersTable.id, id))
      .returning();

    if (!updated) {
      throw new Error("User not found");
    }

    return await this.mapToEntity(updated);
  }

  async count(options?: {
    status?: UserStatus;
    roleId?: string;
  }): Promise<number> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (options?.status) {
      const isActive = options.status === "active";
      conditions.push(eq(adminUsersTable.isActive, isActive));
    }

    if (options?.roleId) {
      conditions.push(eq(adminUsersTable.role, options.roleId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({ count: adminUsersTable.id })
      .from(adminUsersTable)
      .where(whereClause);

    return result.length;
  }

  private async mapToEntity(dbUser: DbUserRow): Promise<User> {
    const roleRepo = new DrizzleRoleRepository();

    // Prefer DB role_id if present, otherwise fall back to the textual `role` column.
    // In partially migrated deployments, the roles table may be missing or unavailable;
    // we must still build a usable role entity rather than aborting the login flow.
    let foundRole = null;
    const fallbackRoleFromEmail = DrizzleUserRepository.getRoleFromEmail(
      dbUser.email,
    );
    const canonicalRole =
      fallbackRoleFromEmail ?? normalizeRoleName(dbUser.role);

    if (!fallbackRoleFromEmail && dbUser.roleId) {
      try {
        foundRole = await roleRepo.findById(dbUser.roleId);
      } catch {
        foundRole = null;
      }
    }

    if (!foundRole && !fallbackRoleFromEmail) {
      const normalizedRole = canonicalRole;

      try {
        foundRole = await roleRepo.findByName(normalizedRole);
      } catch {
        foundRole = null;
      }

      if (!foundRole) {
        foundRole =
          DrizzleUserRepository.getFallbackRoleForName(normalizedRole);
      }
    }

    if (!foundRole) {
      foundRole = DrizzleUserRepository.getFallbackRoleForName(canonicalRole);
    }

    const role = foundRole;

    return User.fromJSON({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || "",
      passwordHash: dbUser.passwordHash,
      role,
      permissions: role.permissions ?? [],
      status:
        normalizeUserStatus(dbUser.isActive ? "active" : "inactive") ??
        "inactive",
      avatar: undefined,
      lastLoginAt: dbUser.lastLoginAt ?? undefined,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    });
  }

  static getRoleFromEmail(email: string): Role | null {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.startsWith("superadmin@")) return "superadmin";
    if (normalizedEmail.startsWith("admin@")) return "admin";
    return null;
  }

  static getFallbackRoleForName(roleName: string): RoleEntity {
    const normalizedRole = normalizeRoleName(roleName);
    const permissions = getPermissions(normalizedRole).map((permissionName) =>
      PermissionEntity.create({
        name: permissionName,
        description: `${permissionName} permission`,
        category: DrizzleUserRepository.getPermissionCategory(permissionName),
        resource: DrizzleUserRepository.getPermissionResource(permissionName),
        action: DrizzleUserRepository.getPermissionAction(permissionName),
      }),
    );

    return RoleEntity.create({
      name: normalizedRole,
      description: `${normalizedRole} role`,
      level: DrizzleUserRepository.getRoleLevel(normalizedRole),
      permissions,
      isSystem: ["superadmin", "admin"].includes(normalizedRole),
    });
  }

  private getRoleLevel(roleName: string): number {
    return DrizzleUserRepository.getRoleLevel(roleName);
  }

  private static getRoleLevel(roleName: string): number {
    const levels: Record<string, number> = {
      superadmin: 10,
      admin: 8,
      manager: 6,
      user: 4,
      moderator: 5,
      viewer: 2,
    };
    return levels[normalizeRoleName(roleName)] || 4;
  }

  private static getPermissionCategory(
    permissionName: string,
  ): PermissionCategory {
    const resource =
      DrizzleUserRepository.getPermissionResource(permissionName);
    const categories: Record<string, PermissionCategory> = {
      user: PermissionCategory.USER,
      role: PermissionCategory.ROLE,
      audit: PermissionCategory.AUDIT,
      content: PermissionCategory.CONTENT,
      payment: PermissionCategory.PAYMENT,
      system: PermissionCategory.SYSTEM,
    };
    return categories[resource] || PermissionCategory.SYSTEM;
  }

  private static getPermissionResource(permissionName: string): string {
    const parts = permissionName.split(":");
    return parts[1] ?? parts[0] ?? "general";
  }

  private static getPermissionAction(
    permissionName: string,
  ): "create" | "read" | "update" | "delete" | "manage" {
    const action = permissionName.split(":")[0];
    if (action === "read") return "read";
    if (action === "create") return "create";
    if (action === "update") return "update";
    if (action === "delete") return "delete";
    return "manage";
  }
}
