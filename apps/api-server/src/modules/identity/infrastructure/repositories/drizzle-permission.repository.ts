import { IPermissionRepository } from "../../domain/repositories/IPermissionRepository";
import {
  Permission,
  PermissionCategory,
} from "../../domain/entities/permission.entity";
import {
  Permissions,
  type PermissionName,
} from "@/shared/constants/permissions";

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
    return this.findByName(id);
  }

  async findByName(name: PermissionName | string): Promise<Permission | null> {
    const permissionName = String(name);
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
    let permissions = Object.values(Permissions) as PermissionName[];

    if (options?.category) {
      permissions = permissions.filter(
        (permissionName) =>
          resolvePermissionCategory(permissionName) === options.category,
      );
    }

    if (options?.skip) {
      permissions = permissions.slice(options.skip);
    }

    if (options?.take) {
      permissions = permissions.slice(0, options.take);
    }

    return permissions.map((permissionName) =>
      Permission.create({
        name: permissionName,
        description: `${permissionName} permission`,
        category: resolvePermissionCategory(permissionName),
        resource: resolvePermissionResource(permissionName),
        action: resolvePermissionAction(permissionName),
      }),
    );
  }

  async create(permission: Permission): Promise<Permission> {
    // TODO: Implement when permission table is created
    // For now, just return the permission as is
    return permission;
  }

  async update(
    id: string,
    permission: Partial<Permission>,
  ): Promise<Permission> {
    // TODO: Implement when permission table is created
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Permission not found");
    }
    return existing;
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement when permission table is created
  }

  async count(options?: { category?: string }): Promise<number> {
    let permissions = Object.values(Permissions) as PermissionName[];

    if (options?.category) {
      permissions = permissions.filter(
        (permissionName) =>
          resolvePermissionCategory(permissionName) === options.category,
      );
    }

    return permissions.length;
  }
}
