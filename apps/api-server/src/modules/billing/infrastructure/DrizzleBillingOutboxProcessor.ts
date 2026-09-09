import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db, billingOutboxTable } from "@workspace/db";
import { logAuditEvent } from "@/shared/utils/audit";
import type { AuditAction } from "@/modules/audit/audit.types";
import { Logger } from "@/shared/utils/logger";

interface BillingAuditPayload {
  actorType?:
    | "USER"
    | "ADMIN"
    | "SYSTEM"
    | "BOT"
    | "API"
    | "WEBHOOK"
    | "CRON_JOB"
    | "UNKNOWN";
  targetType?:
    | "USER"
    | "ADMIN"
    | "SUBSCRIPTION"
    | "PAYMENT"
    | "CONFIG"
    | "BOT"
    | "AUDIT_LOG"
    | "ROLE"
    | "PERMISSION"
    | "ORGANIZATION"
    | "TEAM"
    | "PROJECT"
    | "DATABASE"
    | "FILE"
    | "UNKNOWN";
  targetId?: string;
  metadata?: Record<string, unknown>;
  tags?: Record<string, string>;
  compliance?: { gdpr?: boolean; pci?: boolean; hipaa?: boolean };
}

export class DrizzleBillingOutboxProcessor {
  private readonly logger = Logger.getInstance("BillingOutboxProcessor");

  async processBatch(limit = 25): Promise<number> {
    let processed = 0;

    for (let index = 0; index < limit; index += 1) {
      const event = await this.claimNext();
      if (!event) break;

      try {
        const payload = event.payload as BillingAuditPayload;
        const result = await logAuditEvent({
          action: event.eventType as AuditAction,
          actorType: payload.actorType ?? "SYSTEM",
          targetType: payload.targetType ?? "UNKNOWN",
          targetId: payload.targetId ?? event.aggregateId,
          metadata: payload.metadata,
          tags: payload.tags,
          compliance: payload.compliance,
        });

        if (!result.success) throw new Error("Audit event delivery failed");

        await db
          .update(billingOutboxTable)
          .set({
            status: "processed",
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(billingOutboxTable.id, event.id));
        processed += 1;
      } catch (error) {
        this.logger.error("Failed to process billing outbox event", {
          eventId: event.id,
          error,
        });
        await db
          .update(billingOutboxTable)
          .set({
            status: "failed",
            availableAt: new Date(Date.now() + 30_000),
            lastError: error instanceof Error ? error.message : String(error),
            updatedAt: new Date(),
          })
          .where(eq(billingOutboxTable.id, event.id));
      }
    }

    return processed;
  }

  private async claimNext() {
    const now = new Date();
    const [candidate] = await db
      .select()
      .from(billingOutboxTable)
      .where(
        and(
          eq(billingOutboxTable.status, "pending"),
          lte(billingOutboxTable.availableAt, now),
        ),
      )
      .orderBy(asc(billingOutboxTable.createdAt))
      .limit(1);

    if (!candidate) return null;

    const [claimed] = await db
      .update(billingOutboxTable)
      .set({
        status: "processing",
        attempts: sql`${billingOutboxTable.attempts} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(billingOutboxTable.id, candidate.id),
          eq(billingOutboxTable.status, "pending"),
        ),
      )
      .returning();

    return claimed ?? null;
  }
}
