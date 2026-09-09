import { injectable } from "tsyringe";
import { and, eq, desc, count } from "drizzle-orm";
import {
  db,
  billingInvoicesTable,
  billingOutboxTable,
  billingPaymentsTable,
  subscriptionPlansTable,
  subscriptionsTable,
} from "@workspace/db";
import {
  Invoice,
  Payment,
  PaymentProps,
  PaymentStatus,
  PaymentProvider,
  IPaymentRepository,
} from "../domain";
import { PaginatedResult, PaginationParams } from "@/shared/types";
import { AppError, ErrorCodes } from "@/shared/errors";

class DatabaseError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 500, ErrorCodes.DATABASE_ERROR, true, cause as Error);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 404, ErrorCodes.NOT_FOUND);
  }
}

@injectable()
export class DrizzlePaymentRepository implements IPaymentRepository {
  async findById(id: string): Promise<Payment | null> {
    const [row] = await db
      .select()
      .from(billingPaymentsTable)
      .where(eq(billingPaymentsTable.id, id))
      .limit(1);

    return row ? this.mapRow(row) : null;
  }

  async findAll(
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Payment>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(billingPaymentsTable);

    const rows = await db
      .select()
      .from(billingPaymentsTable)
      .orderBy(desc(billingPaymentsTable.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    const payments = rows.map((r) => this.mapRow(r));
    const totalPages = Math.ceil(Number(total) / pagination.limit) || 1;

    return {
      data: payments,
      total: Number(total),
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
    };
  }

  async findByUserId(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Payment>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(billingPaymentsTable)
      .where(eq(billingPaymentsTable.userId, userId));

    const rows = await db
      .select()
      .from(billingPaymentsTable)
      .where(eq(billingPaymentsTable.userId, userId))
      .orderBy(desc(billingPaymentsTable.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    const payments = rows.map((r) => this.mapRow(r));
    const totalPages = Math.ceil(Number(total) / pagination.limit) || 1;

    return {
      data: payments,
      total: Number(total),
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
    };
  }

  async findByInvoiceId(invoiceId: string): Promise<Payment[]> {
    const rows = await db
      .select()
      .from(billingPaymentsTable)
      .where(eq(billingPaymentsTable.invoiceId, invoiceId))
      .orderBy(desc(billingPaymentsTable.createdAt));

    return rows.map((r) => this.mapRow(r));
  }

  async save(payment: Payment): Promise<Payment> {
    const p = payment.toProps();
    const [row] = await db
      .insert(billingPaymentsTable)
      .values({
        id: p.id,
        userId: p.userId,
        invoiceId: p.invoiceId,
        amountCents: p.amountCents,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        providerPaymentId: p.providerPaymentId,
        failureReason: p.failureReason,
        metadata: p.metadata as any,
      })
      .returning();

    if (!row) {
      throw new DatabaseError("Failed to create payment");
    }

    return this.mapRow(row);
  }

  async saveAndSettle(payment: Payment, invoice: Invoice): Promise<Payment> {
    const paymentProps = payment.toProps();
    const invoiceProps = invoice.toProps();

    return db.transaction(async (tx) => {
      const [paymentRow] = await tx
        .insert(billingPaymentsTable)
        .values({
          id: paymentProps.id,
          userId: paymentProps.userId,
          invoiceId: paymentProps.invoiceId,
          amountCents: paymentProps.amountCents,
          currency: paymentProps.currency,
          status: paymentProps.status,
          provider: paymentProps.provider,
          providerPaymentId: paymentProps.providerPaymentId,
          failureReason: paymentProps.failureReason,
          metadata: paymentProps.metadata as any,
        })
        .returning();

      if (!paymentRow) throw new DatabaseError("Failed to create payment");

      if (invoice.isPaid()) {
        const [invoiceRow] = await tx
          .update(billingInvoicesTable)
          .set({
            status: invoiceProps.status,
            paidAt: invoiceProps.paidAt,
            updatedAt: new Date(),
          })
          .where(eq(billingInvoicesTable.id, invoiceProps.id))
          .returning({ id: billingInvoicesTable.id });
        if (!invoiceRow) throw new NotFoundError("Invoice", invoiceProps.id);

        await this.activateLegacySubscription(tx, paymentProps);
      }

      await tx.insert(billingOutboxTable).values({
        eventType: "PAYMENT_COMPLETED",
        aggregateId: paymentProps.id,
        payload: {
          actorType: paymentProps.provider === "manual" ? "SYSTEM" : "WEBHOOK",
          targetType: "PAYMENT",
          targetId: paymentProps.id,
          metadata: {
            provider: paymentProps.provider,
            providerPaymentId: paymentProps.providerPaymentId,
            invoiceId: paymentProps.invoiceId,
            amountCents: paymentProps.amountCents,
            currency: paymentProps.currency,
          },
          tags: {
            billing: "payment",
            provider: paymentProps.provider,
          },
          compliance: { pci: true },
        },
      });

      return this.mapRow(paymentRow);
    });
  }

  private async activateLegacySubscription(
    tx: any,
    payment: PaymentProps,
  ): Promise<void> {
    const planId = payment.metadata.planId;
    if (typeof planId !== "string" || !planId) return;

    const [plan] = await tx
      .select()
      .from(subscriptionPlansTable)
      .where(
        and(
          eq(subscriptionPlansTable.id, planId),
          eq(subscriptionPlansTable.isActive, true),
        ),
      )
      .limit(1);
    if (!plan || plan.deletedAt || plan.durationDays <= 0) return;

    const now = new Date();
    const [existing] = await tx
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.userId, payment.userId),
          eq(subscriptionsTable.status, "active"),
        ),
      )
      .orderBy(desc(subscriptionsTable.endDate))
      .limit(1);

    const startDate =
      existing && existing.endDate > now ? existing.endDate : now;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    if (existing) {
      await tx
        .update(subscriptionsTable)
        .set({
          planId: plan.id,
          status: "active",
          startDate: existing.startDate,
          endDate,
          cancelledAt: null,
          updatedAt: now,
        })
        .where(eq(subscriptionsTable.id, existing.id));
      return;
    }

    await tx.insert(subscriptionsTable).values({
      userId: payment.userId,
      planId: plan.id,
      status: "active",
      startDate: now,
      endDate,
      autoRenew: false,
      cancelledAt: null,
    });
  }

  async update(payment: Payment): Promise<Payment> {
    const p = payment.toProps();
    const [row] = await db
      .update(billingPaymentsTable)
      .set({
        status: p.status,
        providerPaymentId: p.providerPaymentId,
        failureReason: p.failureReason,
        metadata: p.metadata as any,
        updatedAt: new Date(),
      })
      .where(eq(billingPaymentsTable.id, p.id))
      .returning();

    if (!row) {
      throw new NotFoundError("Payment", p.id);
    }

    return this.mapRow(row);
  }

  async updateAndAuditRefund(payment: Payment): Promise<Payment> {
    const props = payment.toProps();

    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(billingPaymentsTable)
        .set({
          status: props.status,
          providerPaymentId: props.providerPaymentId,
          failureReason: props.failureReason,
          metadata: props.metadata as any,
          updatedAt: new Date(),
        })
        .where(eq(billingPaymentsTable.id, props.id))
        .returning();

      if (!row) throw new NotFoundError("Payment", props.id);

      await tx.insert(billingOutboxTable).values({
        eventType: "PAYMENT_REFUNDED",
        aggregateId: props.id,
        payload: {
          actorType: "SYSTEM",
          targetType: "PAYMENT",
          targetId: props.id,
          metadata: {
            provider: props.provider,
            providerPaymentId: props.providerPaymentId,
            invoiceId: props.invoiceId,
            amountCents: props.amountCents,
            currency: props.currency,
          },
          tags: {
            billing: "refund",
            provider: props.provider,
          },
          compliance: { pci: true },
        },
      });

      return this.mapRow(row);
    });
  }

  async delete(id: string): Promise<void> {
    await db
      .delete(billingPaymentsTable)
      .where(eq(billingPaymentsTable.id, id));
  }

  private mapRow(row: any): Payment {
    return Payment.reconstitute({
      id: row.id,
      userId: row.userId,
      invoiceId: row.invoiceId,
      amountCents: row.amountCents,
      currency: row.currency,
      status: row.status as PaymentStatus,
      provider: row.provider as PaymentProvider,
      providerPaymentId: row.providerPaymentId,
      failureReason: row.failureReason,
      metadata: row.metadata || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
