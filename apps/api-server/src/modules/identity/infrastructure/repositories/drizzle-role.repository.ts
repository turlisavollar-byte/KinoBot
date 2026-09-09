import { IRoleRepository } from "../../domain/repositories/IRoleRepository";
import { Role } from "../../domain/entities/role.entity";
import {
  Permission,
  PermissionCategory,
} from "../../domain/entities/permission.entity";
import {
  Permissions,
  type PermissionName,
} from "@/shared/constants/permissions";
import {
  RoleHierarchy,
  RoleValues,
  Roles,
  normalizeRoleName,
  type Role as CanonicalRole,
} from "@/shared/constants/roles";
import { ROLE_PERMISSIONS } from "@/shared/constants/role-permissions";
import {
  db,
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

const ROLE_DEFINITIONS: Record<
  CanonicalRole,
  {
    description: string;
    level: number;
    isSystem: boolean;
    permissions: PermissionName[];
  }
> = {
  superadmin: {
    description: "Super Administrator with full access",
    level: RoleHierarchy.superadmin,
    isSystem: true,
    permissions: ROLE_PERMISSIONS.superadmin,
  },
  admin: {
    description: "Administrator with most access",
    level: RoleHierarchy.admin,
    isSystem: true,
    permissions: ROLE_PERMISSIONS.admin,
  },
  manager: {
    description: "Manager with content and user access",
    level: RoleHierarchy.manager,
    isSystem: false,
    permissions: ROLE_PERMISSIONS.manager,
  },
  user: {
    description: "Standard user with base access",
    level: RoleHierarchy.user,
    isSystem: false,
    permissions: ROLE_PERMISSIONS.user,
  },
  moderator: {
    description: "Moderator with moderation access",
    level: RoleHierarchy.moderator,
    isSystem: false,
    permissions: ROLE_PERMISSIONS.moderator,
  },
  viewer: {
    description: "Viewer with read-only access",
    level: RoleHierarchy.viewer,
    isSystem: false,
    permissions: ROLE_PERMISSIONS.viewer,
  },
};

export class DrizzleRoleRepository implements IRoleRepository {
  async findById(id: string): Promise<Role | null> {
    // Since roles are stored as strings in current schema, find by name
    // attempt by id in DB first
    try {
      const [row] = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.id, id))
        .limit(1);
      if (row) return this.mapRowToRole(row);
    } catch {
      // Database is missing/does not expose roles table yet; fall through to in-memory fallback.
    }
    return this.findByName(id);
  }

  async findByName(name: string): Promise<Role | null> {
    const canonicalName = normalizeRoleName(name);
    try {
      // first try DB-backed roles by name
      const [roleRow] = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.name, canonicalName))
        .limit(1);

      if (roleRow) {
        return this.mapRowToRole(roleRow);
      }
    } catch {
      // Roles table may not exist in a partially migrated deployment.
    }

    // fallback to in-code definitions
    const roleData = ROLE_DEFINITIONS[canonicalName];
    if (!roleData) return null;

    const permissions = roleData.permissions.map((permName) =>
      Permission.create({
        name: permName,
        description: `${permName} permission`,
        category: this.getPermissionCategory(permName),
        resource: this.getPermissionResource(permName),
        action: this.getPermissionAction(permName),
      }),
    );

    return Role.create({
      name: canonicalName,
      description: roleData.description,
      level: roleData.level,
      permissions,
      isSystem: roleData.isSystem,
    });
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    isSystem?: boolean;
  }): Promise<Role[]> {
    // Try DB-backed roles first
    const where =
      options?.isSystem !== undefined
        ? eq(rolesTable.isSystem, options.isSystem)
        : undefined;
    const rows = await db
      .select()
      .from(rolesTable)
      .where(where)
      .limit(options?.take ?? 100)
      .offset(options?.skip ?? 0);

    if (rows.length > 0) {
      return Promise.all(rows.map((r) => this.mapRowToRole(r)));
    }

    // fallback: return in-code roles
    let roleNames = Object.values(Roles) as CanonicalRole[];

    if (options?.isSystem !== undefined) {
      roleNames = roleNames.filter(
        (roleName) => ROLE_DEFINITIONS[roleName].isSystem === options.isSystem,
      );
    }

    if (options?.skip) {
      roleNames = roleNames.slice(options.skip);
    }

    if (options?.take) {
      roleNames = roleNames.slice(0, options.take);
    }

    return Promise.all(
      roleNames.map((roleName) => this.findByName(roleName) as Promise<Role>),
    );
  }

  async create(role: Role): Promise<Role> {
    // Insert role row and return mapped entity
    await db.insert(rolesTable).values({
      id: role.id,
      name: role.name,
      description: role.description,
      level: role.level,
      isSystem: !!role.isSystem,
    });

    // Optionally attach permissions if provided
    if (role.permissions && role.permissions.length > 0) {
      for (const perm of role.permissions) {
        // ensure permission exists
        const [permRow] = await db
          .select()
          .from(permissionsTable)
          .where(eq(permissionsTable.name, perm.name))
          .limit(1);

        let permissionId = permRow?.id;
        if (!permissionId) {
          permissionId = crypto.randomUUID();
          await db.insert(permissionsTable).values({
            id: permissionId,
            name: perm.name,
            description: perm.description,
            category: perm.category,
            resource: perm.resource,
            action: perm.action,
          });
        }

        // add mapping if not exists
        const [existing] = await db
          .select()
          .from(rolePermissionsTable)
          .where(
            and(
              eq(rolePermissionsTable.roleId, role.id),
              eq(rolePermissionsTable.permissionId, permissionId),
            ),
          )
          .limit(1);
        if (!existing) {
          await db.insert(rolePermissionsTable).values({
            roleId: role.id,
            permissionId,
          });
        }
      }
    }

    const [inserted] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, role.id))
      .limit(1);

    return this.mapRowToRole(inserted);
  }

  async update(id: string, role: Partial<Role>): Promise<Role> {
    const updateData: any = {};
    if (role.description !== undefined)
      updateData.description = role.description;
    if (role.level !== undefined) updateData.level = role.level;
    if (role.isSystem !== undefined) updateData.isSystem = role.isSystem;
    if (role.name !== undefined) updateData.name = role.name;

    await db.update(rolesTable).set(updateData).where(eq(rolesTable.id, id));

    const [updated] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, id))
      .limit(1);
    if (!updated) throw new Error("Role not found");
    return this.mapRowToRole(updated);
  }

  async delete(id: string): Promise<void> {
    const role = await this.findById(id);
    if (!role) return;
    if (role.isSystem) throw new Error("Cannot delete system role");
    await db
      .delete(rolePermissionsTable)
      .where(eq(rolePermissionsTable.roleId, id));
    await db.delete(rolesTable).where(eq(rolesTable.id, id));
  }

  async addPermission(
    roleId: string,
    permission: PermissionName | string,
  ): Promise<Role> {
    const role = await this.findById(roleId);
    if (!role) throw new Error("Role not found");

    const permissionName = String(permission);

    let [permRow] = await db
      .select()
      .from(permissionsTable)
      .where(eq(permissionsTable.name, permissionName))
      .limit(1);

    if (!permRow) {
      const newPermId = crypto.randomUUID();
      await db.insert(permissionsTable).values({
        id: newPermId,
        name: permissionName,
        description: `${permissionName} permission`,
      });
      [permRow] = await db
        .select()
        .from(permissionsTable)
        .where(eq(permissionsTable.id, newPermId))
        .limit(1);
    }

    const existing = await db
      .select()
      .from(rolePermissionsTable)
      .where(
        and(
          eq(rolePermissionsTable.roleId, roleId),
          eq(rolePermissionsTable.permissionId, permRow.id),
        ),
      )
      .limit(1);

    if (!existing || existing.length === 0) {
      await db
        .insert(rolePermissionsTable)
        .values({ roleId, permissionId: permRow.id });
    }

    return this.findById(roleId) as Promise<Role>;
  }

  async removePermission(
    roleId: string,
    permissionName: string,
  ): Promise<Role> {
    const role = await this.findById(roleId);
    if (!role) throw new Error("Role not found");

    const [permRow] = await db
      .select()
      .from(permissionsTable)
      .where(eq(permissionsTable.name, permissionName))
      .limit(1);

    if (!permRow) return role;

    await db
      .delete(rolePermissionsTable)
      .where(
        and(
          eq(rolePermissionsTable.roleId, roleId),
          eq(rolePermissionsTable.permissionId, permRow.id),
        ),
      );

    return this.findById(roleId) as Promise<Role>;
  }

  async count(options?: { isSystem?: boolean }): Promise<number> {
    if (options?.isSystem !== undefined) {
      const rows = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.isSystem, options.isSystem));
      return rows.length;
    }

    const rows = await db.select().from(rolesTable);
    if (rows.length > 0) return rows.length;

    // fallback
    let roleNames = Object.values(Roles) as CanonicalRole[];
    return roleNames.length;
  }

  private async mapRowToRole(row: any): Promise<Role> {
    // load permissions for role from database
    const permRows = await db
      .select({
        id: permissionsTable.id,
        name: permissionsTable.name,
        description: permissionsTable.description,
        category: permissionsTable.category,
        resource: permissionsTable.resource,
        action: permissionsTable.action,
      })
      .from(rolePermissionsTable)
      .leftJoin(
        permissionsTable,
        eq(rolePermissionsTable.permissionId, permissionsTable.id),
      )
      .where(eq(rolePermissionsTable.roleId, row.id));

    // Authorization is code-defined by ROLE_PERMISSIONS. Database rows are
    // retained for metadata, but must not silently expand or preserve grants.
    const canonicalRole = normalizeRoleName(row.name);
    const canonicalPermissions = ROLE_PERMISSIONS[canonicalRole] ?? [];

    const permissions = canonicalPermissions.map((permName) => {
      const dbPerm = permRows.find((p: any) => p.name === permName);
      return Permission.create({
        name: permName,
        description: dbPerm?.description ?? `${permName} permission`,
        category:
          (dbPerm?.category as PermissionCategory) ??
          this.getPermissionCategory(permName),
        resource: dbPerm?.resource ?? this.getPermissionResource(permName),
        action:
          (dbPerm?.action as
            "read" | "create" | "update" | "delete" | "manage") ??
          this.getPermissionAction(permName),
      });
    });

    return Role.fromJSON({
      id: row.id,
      name: row.name,
      description: row.description,
      level: row.level,
      permissions,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isSystem: !!row.isSystem || !!row.is_system,
    });
  }

  private getPermissionCategory(permissionName: string): PermissionCategory {
    const resource = this.getPermissionResource(permissionName);
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

  private getPermissionResource(permissionName: string): string {
    const parts = permissionName.split(":");
    return parts[1] ?? parts[0] ?? "general";
  }

  private getPermissionAction(
    permissionName: string,
  ): "read" | "create" | "update" | "delete" | "manage" {
    const action = permissionName.split(":")[0];
    if (action === "read") return "read";
    if (action === "create") return "create";
    if (action === "update") return "update";
    if (action === "delete") return "delete";
    return "manage";
  }
}
