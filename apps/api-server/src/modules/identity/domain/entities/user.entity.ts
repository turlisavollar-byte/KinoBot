import { Role } from "./role.entity";
import { Permission } from "./permission.entity";
import { UserStatus } from "@/shared/constants/user-status";

export interface UserProps {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  permissions?: Permission[];
  status: UserStatus;
  avatar?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(
    props: Omit<UserProps, "id" | "createdAt" | "updatedAt">,
  ): User {
    return new User({
      ...props,
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromJSON(json: UserProps): User {
    return new User(json);
  }

  get id(): string {
    return this.props.id;
  }
  get email(): string {
    return this.props.email;
  }
  get name(): string {
    return this.props.name;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get role(): Role {
    return this.props.role;
  }
  get permissions(): Permission[] {
    return this.props.permissions || [];
  }
  get status(): UserStatus {
    return this.props.status;
  }
  get isActive(): boolean {
    return this.props.status === "active";
  }
  get avatar(): string | undefined {
    return this.props.avatar;
  }
  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  hasPermission(permission: string): boolean {
    // Check direct permissions
    if (this.permissions.some((p) => p.name === permission)) {
      return true;
    }
    // Check role permissions
    return this.role.hasPermission(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(p));
  }

  canManage(user: User): boolean {
    return this.role.level > user.role.level;
  }

  updateLastLogin(): User {
    return new User({
      ...this.props,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    });
  }

  updateStatus(status: UserStatus): User {
    return new User({
      ...this.props,
      status,
      updatedAt: new Date(),
    });
  }

  updateRole(role: Role): User {
    return new User({
      ...this.props,
      role,
      updatedAt: new Date(),
    });
  }

  toJSON(): UserProps {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      passwordHash: this.passwordHash,
      role: this.role,
      permissions: this.permissions,
      status: this.props.status,
      avatar: this.avatar,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toSafeJSON(): Omit<UserProps, "passwordHash"> {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      permissions: this.permissions,
      status: this.props.status,
      avatar: this.avatar,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
