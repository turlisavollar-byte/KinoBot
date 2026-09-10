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
  lastFailedLoginAt?: Date;
  failedLoginCount?: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  verificationToken?: string;
  verificationExpiresAt?: Date;
  isEmailVerified?: boolean;
  resetToken?: string;
  resetExpiresAt?: Date;
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
  get lastFailedLoginAt(): Date | undefined {
    return this.props.lastFailedLoginAt;
  }
  get failedLoginCount(): number {
    return this.props.failedLoginCount ?? 0;
  }
  get lockedUntil(): Date | undefined {
    return this.props.lockedUntil;
  }
  get isLocked(): boolean {
    if (!this.props.lockedUntil) return false;
    return new Date() < this.props.lockedUntil;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get verificationToken(): string | undefined {
    return this.props.verificationToken;
  }
  get verificationExpiresAt(): Date | undefined {
    return this.props.verificationExpiresAt;
  }
  get isEmailVerified(): boolean {
    return this.props.isEmailVerified ?? false;
  }
  get resetToken(): string | undefined {
    return this.props.resetToken;
  }
  get resetExpiresAt(): Date | undefined {
    return this.props.resetExpiresAt;
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
      failedLoginCount: 0,
      lockedUntil: undefined,
      updatedAt: new Date(),
    });
  }

  recordFailedLogin(): User {
    const newCount = (this.props.failedLoginCount ?? 0) + 1;
    return new User({
      ...this.props,
      lastFailedLoginAt: new Date(),
      failedLoginCount: newCount,
      updatedAt: new Date(),
    });
  }

  lockAccount(durationMinutes: number = 30): User {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + durationMinutes);
    return new User({
      ...this.props,
      lockedUntil,
      updatedAt: new Date(),
    });
  }

  unlockAccount(): User {
    return new User({
      ...this.props,
      lockedUntil: undefined,
      failedLoginCount: 0,
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
      lastFailedLoginAt: this.lastFailedLoginAt,
      failedLoginCount: this.failedLoginCount,
      lockedUntil: this.lockedUntil,
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
      lastFailedLoginAt: this.lastFailedLoginAt,
      failedLoginCount: this.failedLoginCount,
      lockedUntil: this.lockedUntil,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
