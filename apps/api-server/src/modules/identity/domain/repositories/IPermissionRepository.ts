import { type PermissionName } from "@/shared/constants/permissions";
import { Permission } from "../entities/permission.entity";

export interface IPermissionRepository {
  findById(id: string): Promise<Permission | null>;
  findByName(name: PermissionName | string): Promise<Permission | null>;
  findAll(options?: {
    skip?: number;
    take?: number;
    category?: string;
  }): Promise<Permission[]>;
  create(permission: Permission): Promise<Permission>;
  update(id: string, permission: Partial<Permission>): Promise<Permission>;
  delete(id: string): Promise<void>;
  count(options?: { category?: string }): Promise<number>;
}
