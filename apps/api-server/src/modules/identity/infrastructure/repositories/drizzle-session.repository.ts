import { and, eq, gt, isNull } from "drizzle-orm";
import { adminSessionsTable, db } from "@workspace/db";
import type { ISessionRepository } from "../../domain/repositories/ISessionRepository";
import crypto from "node:crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class DrizzleSessionRepository implements ISessionRepository {
  async create(
    adminId: string,
    token: string,
    expiresAt: Date,
    metadata?: {
      device?: string;
      ip?: string;
      userAgent?: string;
      sessionName?: string;
    },
  ): Promise<void> {
    await db.insert(adminSessionsTable).values({
      adminId,
      tokenHash: hashToken(token),
      expiresAt,
      device: metadata?.device,
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      sessionName: metadata?.sessionName,
      lastUsedAt: new Date(),
    });
  }

  async isActive(adminId: string, token: string): Promise<boolean> {
    const [session] = await db
      .select({ id: adminSessionsTable.id })
      .from(adminSessionsTable)
      .where(
        and(
          eq(adminSessionsTable.adminId, adminId),
          eq(adminSessionsTable.tokenHash, hashToken(token)),
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
          eq(adminSessionsTable.tokenHash, hashToken(token)),
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

  async rotate(
    adminId: string,
    oldToken: string,
    newToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Claim the old session in one conditional write so only one concurrent
      // refresh request can rotate it successfully.
      const [revokedSession] = await tx
        .update(adminSessionsTable)
        .set({ revokedAt: new Date(), lastUsedAt: new Date() })
        .where(
          and(
            eq(adminSessionsTable.adminId, adminId),
            eq(adminSessionsTable.tokenHash, hashToken(oldToken)),
            isNull(adminSessionsTable.revokedAt),
            gt(adminSessionsTable.expiresAt, new Date()),
          ),
        )
        .returning({ id: adminSessionsTable.id });

      if (!revokedSession) {
        throw new Error("Refresh token has been revoked or expired");
      }

      // Create the new token
      await tx.insert(adminSessionsTable).values({
        adminId,
        tokenHash: hashToken(newToken),
        expiresAt,
      });
    });
  }

  async updateLastUsed(adminId: string, token: string): Promise<void> {
    await db
      .update(adminSessionsTable)
      .set({ lastUsedAt: new Date() })
      .where(
        and(
          eq(adminSessionsTable.adminId, adminId),
          eq(adminSessionsTable.tokenHash, hashToken(token)),
          isNull(adminSessionsTable.revokedAt),
        ),
      );
  }

  async findByAdminId(adminId: string): Promise<
    Array<{
      id: string;
      device?: string;
      ip?: string;
      userAgent?: string;
      sessionName?: string;
      lastUsedAt?: Date;
      createdAt: Date;
      expiresAt: Date;
    }>
  > {
    const sessions = await db
      .select({
        id: adminSessionsTable.id,
        device: adminSessionsTable.device,
        ip: adminSessionsTable.ip,
        userAgent: adminSessionsTable.userAgent,
        sessionName: adminSessionsTable.sessionName,
        lastUsedAt: adminSessionsTable.lastUsedAt,
        createdAt: adminSessionsTable.createdAt,
        expiresAt: adminSessionsTable.expiresAt,
      })
      .from(adminSessionsTable)
      .where(
        and(
          eq(adminSessionsTable.adminId, adminId),
          isNull(adminSessionsTable.revokedAt),
          gt(adminSessionsTable.expiresAt, new Date()),
        ),
      )
      .orderBy(adminSessionsTable.createdAt);

    // Convert null to undefined for optional fields
    return sessions.map((session) => ({
      id: session.id,
      device: session.device ?? undefined,
      ip: session.ip ?? undefined,
      userAgent: session.userAgent ?? undefined,
      sessionName: session.sessionName ?? undefined,
      lastUsedAt: session.lastUsedAt ?? undefined,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }
}
