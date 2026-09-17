import { injectable } from "tsyringe";
import { and, eq, desc, count, sql } from "drizzle-orm";
import {
  db,
  billingPlansTable,
  billingSubscriptionsTable,
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
        .onConflictDoNothing({
          target: [
            billingPaymentsTable.provider,
            billingPaymentsTable.providerPaymentId,
          ],
        })
        .returning();

      if (!paymentRow) {
        if (!paymentProps.providerPaymentId) {
          throw new DatabaseError(
            "Payment insert conflict without provider payment ID",
          );
        }
        const [existingPayment] = await tx
          .select()
          .from(billingPaymentsTable)
          .where(
            and(
              eq(billingPaymentsTable.provider, paymentProps.provider),
              eq(
                billingPaymentsTable.providerPaymentId,
                paymentProps.providerPaymentId,
              ),
            ),
          )
          .limit(1);
        if (!existingPayment) {
          throw new DatabaseError(
            "Payment conflict did not resolve to an existing payment",
          );
        }
        return this.mapRow(existingPayment);
      }

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

        await this.activateSubscription(tx, paymentProps, invoiceProps);
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

  private async activateSubscription(
    tx: any,
    payment: PaymentProps,
    invoice: ReturnType<Invoice["toProps"]>,
  ): Promise<void> {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`billing-subscription:${payment.userId}`}))`,
    );

    const billingPlanId = invoice.metadata.billingPlanId;
    if (typeof billingPlanId === "string" && billingPlanId) {
      await this.activateBillingSubscription(tx, payment, billingPlanId);
      return;
    }

    const planId = invoice.metadata.planId ?? payment.metadata.planId;
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

  private async activateBillingSubscription(
    tx: any,
    payment: PaymentProps,
    planId: string,
  ): Promise<void> {
    const [plan] = await tx
      .select()
      .from(billingPlansTable)
      .where(
        and(
          eq(billingPlansTable.id, planId),
          eq(billingPlansTable.isActive, true),
        ),
      )
      .limit(1);
    if (!plan) return;

    const now = new Date();
    const [existing] = await tx
      .select()
      .from(billingSubscriptionsTable)
      .where(
        and(
          eq(billingSubscriptionsTable.userId, payment.userId),
          eq(billingSubscriptionsTable.status, "active"),
        ),
      )
      .orderBy(desc(billingSubscriptionsTable.currentPeriodEnd))
      .limit(1);

    const start =
      existing && existing.currentPeriodEnd > now
        ? existing.currentPeriodEnd
        : now;
    const end = new Date(start);
    if (plan.interval === "monthly") end.setMonth(end.getMonth() + 1);
    else if (plan.interval === "yearly") end.setFullYear(end.getFullYear() + 1);
    else end.setFullYear(end.getFullYear() + 100);

    if (existing) {
      await tx
        .update(billingSubscriptionsTable)
        .set({
          planId: plan.id,
          status: "active",
          currentPeriodStart: existing.currentPeriodStart,
          currentPeriodEnd: end,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          updatedAt: now,
        })
        .where(eq(billingSubscriptionsTable.id, existing.id));
      return;
    }

    await tx.insert(billingSubscriptionsTable).values({
      userId: payment.userId,
      planId: plan.id,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialEnd: null,
      metadata: { source: "payment_settlement", provider: payment.provider },
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

      const [invoice] = await tx
        .select()
        .from(billingInvoicesTable)
        .where(eq(billingInvoicesTable.id, props.invoiceId))
        .limit(1);

      if (invoice) {
        const remainingSucceeded = await tx
          .select({ id: billingPaymentsTable.id })
          .from(billingPaymentsTable)
          .where(
            and(
              eq(billingPaymentsTable.invoiceId, props.invoiceId),
              eq(billingPaymentsTable.status, "succeeded"),
            ),
          );

        if (remainingSucceeded.length === 0) {
          await tx
            .update(billingInvoicesTable)
            .set({ status: "void", paidAt: null, updatedAt: new Date() })
            .where(eq(billingInvoicesTable.id, props.invoiceId));

          const metadata = (invoice.metadata ?? {}) as Record<string, unknown>;
          const billingPlanId = metadata.billingPlanId;
          if (typeof billingPlanId === "string" && billingPlanId) {
            await tx
              .update(billingSubscriptionsTable)
              .set({
                status: "canceled",
                canceledAt: new Date(),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(billingSubscriptionsTable.userId, props.userId),
                  eq(billingSubscriptionsTable.planId, billingPlanId),
                  eq(billingSubscriptionsTable.status, "active"),
                ),
              );
          } else if (typeof metadata.planId === "string" && metadata.planId) {
            await tx
              .update(subscriptionsTable)
              .set({
                status: "cancelled",
                cancelledAt: new Date(),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(subscriptionsTable.userId, props.userId),
                  eq(subscriptionsTable.planId, metadata.planId),
                  eq(subscriptionsTable.status, "active"),
                ),
              );
          }
        }
      }

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
