export enum PermissionCategory {
  USER = 'user',
  AUTH = 'auth',
  ROLE = 'role',
  PERMISSION = 'permission',
  AUDIT = 'audit',
  CONTENT = 'content',
  PAYMENT = 'payment',
  SYSTEM = 'system',
}

export interface PermissionProps {
  id: string;
  name: string;
  description: string;
  category: PermissionCategory;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

export class Permission {
  private constructor(private readonly props: PermissionProps) {}

  static create(props: Omit<PermissionProps, 'id'>): Permission {
    return new Permission({
      ...props,
      id: `perm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    });
  }

  static fromJSON(json: PermissionProps): Permission {
    return new Permission(json);
  }

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get category(): PermissionCategory { return this.props.category; }
  get resource(): string { return this.props.resource; }
  get action(): string { return this.props.action; }

  toJSON(): PermissionProps {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      resource: this.resource,
      action: this.props.action,
    };
  }
}

// Permission constants
export const PERMISSIONS = {
  // User permissions
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Role permissions
  ROLE_READ: 'role:read',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  
  // Audit permissions
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',
  AUDIT_ADMIN: 'audit:admin',
  
  // Content permissions
  CONTENT_READ: 'content:read',
  CONTENT_CREATE: 'content:create',
  CONTENT_UPDATE: 'content:update',
  CONTENT_DELETE: 'content:delete',
  
  // Payment permissions
  PAYMENT_READ: 'payment:read',
  PAYMENT_CREATE: 'payment:create',
  PAYMENT_REFUND: 'payment:refund',
  
  // System permissions
  SYSTEM_MANAGE: 'system:manage',
  SYSTEM_VIEW: 'system:view',
} as const;

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];
