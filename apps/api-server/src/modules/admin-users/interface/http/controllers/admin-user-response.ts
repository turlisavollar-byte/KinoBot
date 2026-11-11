export interface SafeAdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeAdminUser<T extends SafeAdminUser>(
  user: T,
): Omit<SafeAdminUser, "lastLoginAt" | "createdAt" | "updatedAt"> & {
  status: "active" | "inactive";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    status: user.isActive ? "active" : "inactive",
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}