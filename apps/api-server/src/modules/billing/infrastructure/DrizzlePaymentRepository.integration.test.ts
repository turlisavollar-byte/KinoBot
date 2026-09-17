import { afterEach, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import {
  billingInvoicesTable,
  billingPlansTable,
  billingSubscriptionsTable,
  billingOutboxTable,
  billingPaymentsTable,
  db,
  usersTable,
} from "@workspace/db";
import { Invoice, Payment } from "../domain";
import { DrizzlePaymentRepository } from "./DrizzlePaymentRepository";

const userId = crypto.randomUUID();
const invoiceId = crypto.randomUUID();
const billingPlanId = crypto.randomUUID();
const providerPaymentId = `integration-${crypto.randomUUID()}`;

const invoice = Invoice.reconstitute({
  id: invoiceId,
  idempotencyKey: null,
  userId,
  subscriptionId: null,
  amountCents: 5000,
  currency: "uzs",
  status: "open",
  dueDate: null,
  paidAt: null,
  lineItems: [
    { description: "Integration plan", quantity: 1, unitAmountCents: 5000 },
  ],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
});

function createPayment() {
  const payment = Payment.create({
    userId,
    invoiceId,
    amountCents: 5000,
    currency: "uzs",
    provider: "p2p",
    providerPaymentId,
  });
  payment.markSucceeded(providerPaymentId);
  return payment;
}

describe.runIf(Boolean(process.env.RUN_DB_INTEGRATION_TESTS))(
  "DrizzlePaymentRepository database concurrency",
  () => {
    afterEach(async () => {
      const payments = await db
        .select({ id: billingPaymentsTable.id })
        .from(billingPaymentsTable)
        .where(eq(billingPaymentsTable.invoiceId, invoiceId));
      await db.delete(billingOutboxTable).where(
        inArray(
          billingOutboxTable.aggregateId,
          payments.map((payment) => payment.id),
        ),
      );
      await db
        .delete(billingPaymentsTable)
        .where(eq(billingPaymentsTable.invoiceId, invoiceId));
      await db
        .delete(billingInvoicesTable)
        .where(eq(billingInvoicesTable.id, invoiceId));
      await db
        .delete(billingSubscriptionsTable)
        .where(eq(billingSubscriptionsTable.userId, userId));
      await db
        .delete(billingPlansTable)
        .where(eq(billingPlansTable.id, billingPlanId));
      await db.delete(usersTable).where(eq(usersTable.id, userId));
    });

    it("handles two identical settlements with one payment and one outbox event", async () => {
      await db.insert(usersTable).values({ id: userId, telegramId: userId });
      await db.insert(billingInvoicesTable).values({
        id: invoiceId,
        userId,
        amountCents: 5000,
        currency: "uzs",
        status: "open",
        lineItems: invoice.lineItems,
        metadata: {},
      });

      const repository = new DrizzlePaymentRepository();
      const [first, second] = await Promise.all([
        repository.saveAndSettle(createPayment(), invoice),
        repository.saveAndSettle(createPayment(), invoice),
      ]);

      expect(first.id).toBe(second.id);

      const payments = await db
        .select()
        .from(billingPaymentsTable)
        .where(eq(billingPaymentsTable.invoiceId, invoiceId));
      const outboxEvents = await db
        .select()
        .from(billingOutboxTable)
        .where(
          and(
            eq(billingOutboxTable.eventType, "PAYMENT_COMPLETED"),
            eq(billingOutboxTable.aggregateId, first.id),
          ),
        );

      expect(payments).toHaveLength(1);
      expect(outboxEvents).toHaveLength(1);
    });

    it("serializes concurrent canonical subscription activation", async () => {
      await db.insert(usersTable).values({ id: userId, telegramId: userId });
      await db.insert(billingPlansTable).values({
        id: billingPlanId,
        name: "Integration monthly",
        description: "Integration test plan",
        priceCents: 5000,
        currency: "uzs",
        interval: "monthly",
        isActive: true,
        metadata: {},
      });
      await db.insert(billingInvoicesTable).values({
        id: invoiceId,
        userId,
        amountCents: 5000,
        currency: "uzs",
        status: "open",
        lineItems: invoice.lineItems,
        metadata: { billingPlanId },
      });

      const repository = new DrizzlePaymentRepository();
      const first = createPayment();
      const second = createPayment();
      second.markSucceeded("provider-2");
      const canonicalInvoice = Invoice.reconstitute({
        ...invoice.toProps(),
        metadata: { billingPlanId },
      });
      canonicalInvoice.markPaid();

      await Promise.all([
        repository.saveAndSettle(first, canonicalInvoice),
        repository.saveAndSettle(second, canonicalInvoice),
      ]);

      const subscriptions = await db
        .select()
        .from(billingSubscriptionsTable)
        .where(eq(billingSubscriptionsTable.userId, userId));

      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].planId).toBe(billingPlanId);
    });
  },
);
