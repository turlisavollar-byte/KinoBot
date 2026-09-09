export interface ISessionRepository {
  create(adminId: string, token: string, expiresAt: Date): Promise<void>;
  isActive(adminId: string, token: string): Promise<boolean>;
  revoke(adminId: string, token: string): Promise<void>;
  revokeAll(adminId: string): Promise<void>;
}
