import { type PermissionName } from "@/shared/constants/permissions";
import { type Role } from "@/shared/constants/roles";
import { Role as RoleEntity } from "../entities/role.entity";

export interface IRoleRepository {
  findById(id: string): Promise<RoleEntity | null>;
  findByName(name: string): Promise<RoleEntity | null>;
  findAll(options?: {
    skip?: number;
    take?: number;
    isSystem?: boolean;
  }): Promise<RoleEntity[]>;
  create(role: RoleEntity): Promise<RoleEntity>;
  update(id: string, role: Partial<RoleEntity>): Promise<RoleEntity>;
  delete(id: string): Promise<void>;
  addPermission(
    roleId: string,
    permission: PermissionName | string,
  ): Promise<RoleEntity>;
  removePermission(
    roleId: string,
    permissionName: PermissionName | string,
  ): Promise<RoleEntity>;
  count(options?: { isSystem?: boolean }): Promise<number>;
}

export type { Role };
