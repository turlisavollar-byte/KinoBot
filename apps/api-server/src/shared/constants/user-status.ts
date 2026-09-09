export const UserStatusValues = [
  "active",
  "inactive",
  "suspended",
  "blocked",
  "deleted",
] as const;

export type UserStatus = (typeof UserStatusValues)[number];

export const UserStatuses = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  BLOCKED: "blocked",
  DELETED: "deleted",
} as const;

export function normalizeUserStatus(status?: string | null): UserStatus | null {
  if (!status) return null;

  const candidate = status.trim().toLowerCase();
  const match = UserStatusValues.find((value) => value === candidate);
  return match ?? null;
}
