import { IPermissionRepository } from "../../domain/repositories/IPermissionRepository";
import {
  Permission,
  PermissionCategory,
} from "../../domain/entities/permission.entity";
import {
  Permissions,
  type PermissionName,
} from "@/shared/constants/permissions";
import { db, permissionsTable } from "@workspace/db";
import { eq, like, and, or } from "drizzle-orm";

function resolvePermissionResource(permissionName: string): string {
  const parts = permissionName.split(":");
  return parts[1] ?? parts[0] ?? "general";
}

function resolvePermissionAction(
  permissionName: string,
): "read" | "create" | "update" | "delete" | "manage" {
  const action = permissionName.split(":")[0];
  if (action === "read") return "read";
  if (action === "create") return "create";
  if (action === "update") return "update";
  if (action === "delete") return "delete";
  return "manage";
}

function resolvePermissionCategory(permissionName: string): PermissionCategory {
  const resource = resolvePermissionResource(permissionName);
  const categories: Record<string, PermissionCategory> = {
    user: PermissionCategory.USER,
    role: PermissionCategory.ROLE,
    audit: PermissionCategory.AUDIT,
    content: PermissionCategory.CONTENT,
    payment: PermissionCategory.PAYMENT,
    system: PermissionCategory.SYSTEM,
    own: PermissionCategory.USER,
    any: PermissionCategory.USER,
  };
  return categories[resource] ?? PermissionCategory.SYSTEM;
}

export class DrizzlePermissionRepository implements IPermissionRepository {
  async findById(id: string): Promise<Permission | null> {
    const [permission] = await db
      .select()
      .from(permissionsTable)
      .where(eq(permissionsTable.id, id))
      .limit(1);

    if (!permission) return null;

    return this.mapToEntity(permission);
  }

  async findByName(name: PermissionName | string): Promise<Permission | null> {
    const permissionName = String(name);
    
    // Try to find in database first
    const [permission] = await db
      .select()
      .from(permissionsTable)
      .where(eq(permissionsTable.name, permissionName))
      .limit(1);

    if (permission) {
      return this.mapToEntity(permission);
    }

    // Fallback to hardcoded permissions if not in database
    const exists = Object.values(Permissions).includes(
      permissionName as PermissionName,
    );
    if (!exists) return null;

    return Permission.create({
      name: permissionName,
      description: `${permissionName} permission`,
      category: resolvePermissionCategory(permissionName),
      resource: resolvePermissionResource(permissionName),
      action: resolvePermissionAction(permissionName),
    });
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    category?: string;
  }): Promise<Permission[]> {
    const conditions: ReturnType<typeof eq | typeof like>[] = [];

    if (options?.category) {
      conditions.push(eq(permissionsTable.category, options.category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const permissions = await db
      .select()
      .from(permissionsTable)
      .where(whereClause)
      .limit(options?.take ?? 100)
      .offset(options?.skip ?? 0);

    return permissions.map((permission) => this.mapToEntity(permission));
  }

  async create(permission: Permission): Promise<Permission> {
    const [created] = await db
      .insert(permissionsTable)
      .values({
        id: crypto.randomUUID(),
        name: permission.name,
        description: permission.description,
        category: permission.category,
        resource: permission.resource,
        action: permission.action,
      })
      .returning();

    return this.mapToEntity(created);
  }

  async update(
    id: string,
    permission: Partial<Permission>,
  ): Promise<Permission> {
    const updateData: Partial<{
      name: string;
      description: string;
      category: string;
      resource: string;
      action: string;
    }> = {};

    if (permission.name) updateData.name = permission.name;
    if (permission.description) updateData.description = permission.description;
    if (permission.category) updateData.category = permission.category;
    if (permission.resource) updateData.resource = permission.resource;
    if (permission.action) updateData.action = permission.action;

    const [updated] = await db
      .update(permissionsTable)
      .set(updateData)
      .where(eq(permissionsTable.id, id))
      .returning();

    if (!updated) {
      throw new Error("Permission not found");
    }

    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await db.delete(permissionsTable).where(eq(permissionsTable.id, id));
  }

  async count(options?: { category?: string }): Promise<number> {
    const conditions: ReturnType<typeof eq | typeof like>[] = [];

    if (options?.category) {
      conditions.push(eq(permissionsTable.category, options.category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({ count: permissionsTable.id })
      .from(permissionsTable)
      .where(whereClause);

    return result.length;
  }

  private mapToEntity(dbPermission: any): Permission {
    return Permission.create({
      name: dbPermission.name,
      description: dbPermission.description || `${dbPermission.name} permission`,
      category: (dbPermission.category as PermissionCategory) || PermissionCategory.SYSTEM,
      resource: dbPermission.resource || "general",
      action: (dbPermission.action as "read" | "create" | "update" | "delete" | "manage") || "manage",
    });
  }
}
