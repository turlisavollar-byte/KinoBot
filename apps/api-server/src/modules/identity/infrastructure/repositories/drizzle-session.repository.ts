import { and, eq, gt, isNull } from "drizzle-orm";
import { adminSessionsTable, db } from "@workspace/db";
import type { ISessionRepository } from "../../domain/repositories/ISessionRepository";

export class DrizzleSessionRepository implements ISessionRepository {
  async create(adminId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(adminSessionsTable).values({ adminId, token, expiresAt });
  }

  async isActive(adminId: string, token: string): Promise<boolean> {
    const [session] = await db
      .select({ id: adminSessionsTable.id })
      .from(adminSessionsTable)
      .where(
        and(
          eq(adminSessionsTable.adminId, adminId),
          eq(adminSessionsTable.token, token),
          isNull(adminSessionsTable.revokedAt),
          gt(adminSessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return Boolean(session);
  }

  async revoke(adminId: string, token: string): Promise<void> {
    await db
      .update(adminSessionsTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(adminSessionsTable.adminId, adminId),
          eq(adminSessionsTable.token, token),
          isNull(adminSessionsTable.revokedAt),
        ),
      );
  }

  async revokeAll(adminId: string): Promise<void> {
    await db
      .update(adminSessionsTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(adminSessionsTable.adminId, adminId),
          isNull(adminSessionsTable.revokedAt),
        ),
      );
  }
}
