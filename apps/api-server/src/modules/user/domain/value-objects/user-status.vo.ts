// modules/user/domain/value-objects/user-status.vo.ts

export type UserStatus =
  "active" | "inactive" | "blocked" | "deleted" | "suspended";
export type UserRole =
  "superadmin" | "admin" | "manager" | "moderator" | "user" | "viewer";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 100,
  admin: 80,
  manager: 60,
  moderator: 50,
  user: 40,
  viewer: 10,
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  superadmin: ["*"],
  admin: ["users:*", "content:*", "subscriptions:*", "analytics:*"],
  manager: ["users:read", "content:*", "subscriptions:read"],
  moderator: ["users:read", "content:*", "subscriptions:read"],
  user: ["content:read", "subscriptions:read"],
  viewer: ["content:read"],
};

export class UserStatusVO {
  constructor(public readonly value: UserStatus) {}

  static fromString(value: string): UserStatusVO {
    const valid = ["active", "inactive", "blocked", "deleted", "suspended"];
    if (!valid.includes(value)) {
      throw new Error(`Invalid user status: ${value}`);
    }
    return new UserStatusVO(value as UserStatus);
  }

  isActive(): boolean {
    return this.value === "active";
  }

  isBlocked(): boolean {
    return this.value === "blocked";
  }

  isDeleted(): boolean {
    return this.value === "deleted";
  }

  canLogin(): boolean {
    return ["active"].includes(this.value);
  }

  toString(): string {
    return this.value;
  }
}

export class UserRoleVO {
  constructor(public readonly value: UserRole) {}

  static fromString(value: string): UserRoleVO {
    const normalized = value.trim().toLowerCase();
    const aliasMap: Record<string, UserRole> = {
      superadmin: "superadmin",
      super_admin: "superadmin",
      admin: "admin",
      manager: "manager",
      moderator: "moderator",
      user: "user",
      viewer: "viewer",
    };

    const canonical = aliasMap[normalized];
    if (!canonical) {
      throw new Error(`Invalid user role: ${value}`);
    }

    return new UserRoleVO(canonical);
  }

  get level(): number {
    return ROLE_HIERARCHY[this.value];
  }

  get permissions(): string[] {
    return ROLE_PERMISSIONS[this.value] || [];
  }

  hasPermission(permission: string): boolean {
    if (this.value === "superadmin") return true;
    return this.permissions.some(
      (p) => p === permission || p === "*" || p.endsWith(":*"),
    );
  }

  canManage(role: UserRoleVO): boolean {
    return this.level > role.level;
  }

  toString(): string {
    return this.value;
  }
}
