import crypto from "node:crypto";
import { Permission, PermissionName } from "./permission.entity";

export interface RoleProps {
  id: string;
  name: string;
  description: string;
  level: number; // 1-10, higher = more powerful
  permissions: Permission[];
  inheritsFrom?: Role[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Role {
  private constructor(private readonly props: RoleProps) {}

  static create(
    props: Omit<RoleProps, "id" | "createdAt" | "updatedAt">,
  ): Role {
    return new Role({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromJSON(json: RoleProps): Role {
    return new Role(json);
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string {
    return this.props.description;
  }
  get level(): number {
    return this.props.level;
  }
  get permissions(): Permission[] {
    return this.props.permissions;
  }
  get isSystem(): boolean {
    return this.props.isSystem;
  }

  hasPermission(permissionName: string): boolean {
    // Check own permissions
    if (this.permissions.some((p) => p.name === permissionName)) {
      return true;
    }

    // Check inherited permissions
    if (this.props.inheritsFrom) {
      for (const parent of this.props.inheritsFrom) {
        if (parent.hasPermission(permissionName)) {
          return true;
        }
      }
    }

    return false;
  }

  addPermission(permission: Permission): Role {
    return new Role({
      ...this.props,
      permissions: [...this.props.permissions, permission],
      updatedAt: new Date(),
    });
  }

  removePermission(permissionName: string): Role {
    return new Role({
      ...this.props,
      permissions: this.props.permissions.filter(
        (p) => p.name !== permissionName,
      ),
      updatedAt: new Date(),
    });
  }

  toJSON(): RoleProps {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      level: this.level,
      permissions: this.permissions,
      inheritsFrom: this.props.inheritsFrom,
      isSystem: this.isSystem,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}

// Predefined roles
export const ROLES = {
  SUPER_ADMIN: "superadmin",
  ADMIN: "admin",
  MANAGER: "manager",
  MODERATOR: "moderator",
  USER: "user",
  VIEWER: "viewer",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

// Role hierarchy levels
export const ROLE_LEVELS = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  MANAGER: 60,
  MODERATOR: 50,
  USER: 40,
  VIEWER: 10,
} as const;

export type RoleLevel = (typeof ROLE_LEVELS)[keyof typeof ROLE_LEVELS];
