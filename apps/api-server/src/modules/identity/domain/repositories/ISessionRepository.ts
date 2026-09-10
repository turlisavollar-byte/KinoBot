export interface ISessionRepository {
  create(adminId: string, token: string, expiresAt: Date, metadata?: {
    device?: string;
    ip?: string;
    userAgent?: string;
    sessionName?: string;
  }): Promise<void>;
  isActive(adminId: string, token: string): Promise<boolean>;
  revoke(adminId: string, token: string): Promise<void>;
  revokeAll(adminId: string): Promise<void>;
  rotate(adminId: string, oldToken: string, newToken: string, expiresAt: Date): Promise<void>;
  updateLastUsed(adminId: string, token: string): Promise<void>;
  findByAdminId(adminId: string): Promise<Array<{
    id: string;
    device?: string;
    ip?: string;
    userAgent?: string;
    sessionName?: string;
    lastUsedAt?: Date;
    createdAt: Date;
    expiresAt: Date;
  }>>;
}
