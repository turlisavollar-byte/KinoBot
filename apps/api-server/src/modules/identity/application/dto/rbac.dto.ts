export interface AssignRoleDTO {
  targetUserId: string;
  newRoleId: string;
}

export interface CreateRoleDTO {
  name: string;
  description: string;
  level: number;
  permissionIds?: string[];
}

export interface UpdateRoleDTO {
  name?: string;
  description?: string;
  level?: number;
  permissionIds?: string[];
}

export interface AddPermissionDTO {
  permissionId: string;
}

export interface RemovePermissionDTO {
  permissionName: string;
}

export interface RoleResponse {
  id: string;
  name: string;
  description: string;
  level: number;
  permissions: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    resource: string;
    action: string;
  }>;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
}

export interface CheckPermissionResponse {
  hasPermission: boolean;
  permission: string;
  userId: string;
}

export interface ListPermissionsDTO {
  skip?: number;
  take?: number;
  category?: string;
}

export interface ListPermissionsResponse {
  permissions: PermissionResponse[];
  total: number;
  skip: number;
  take: number;
}
