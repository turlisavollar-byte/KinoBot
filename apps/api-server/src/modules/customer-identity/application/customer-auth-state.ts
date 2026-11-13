export interface CustomerAuthState {
  status: string;
  isActive: boolean;
  isBlocked: boolean;
  deletedAt: Date | null;
}

export function canAuthenticateCustomer(user: CustomerAuthState): boolean {
  return (
    user.status === "active" &&
    user.isActive &&
    !user.isBlocked &&
    user.deletedAt === null
  );
}
