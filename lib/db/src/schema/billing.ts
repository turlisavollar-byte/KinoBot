import {
  pgTable,
  text,
  numeric,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { subscriptionsTable } from "./subscriptions";

export const paymentsTable = pgTable("payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  subscriptionId: text("subscription_id").references(
    () => subscriptionsTable.id,
  ),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("UZS"),
  status: text("status").notNull().default("pending"),
  provider: text("provider").notNull(),
  providerTransactionId: text("provider_transaction_id"),
  idempotencyKey: text("idempotency_key").unique(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Payme-specific transaction log — one row per Payme transaction
export const paymeTransactionsTable = pgTable("payme_transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  paymentId: text("payment_id")
    .notNull()
    .references(() => paymentsTable.id),
  paycomId: text("paycom_id").notNull().unique(),
  paycomTime: text("paycom_time").notNull(), // unix ms as string
  paycomTimePerform: text("paycom_time_perform"),
  paycomTimeCancel: text("paycom_time_cancel"),
  reason: integer("reason"), // cancel reason code from Payme
  state: integer("state").notNull().default(1), // 1=created, 2=completed, -1=cancelled_before, -2=cancelled_after
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ===== New Billing Module Tables =====

export const billingPlansTable = pgTable("billing_plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  interval: text("interval").notNull(), // 'monthly' | 'yearly' | 'one_time'
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const billingSubscriptionsTable = pgTable("billing_subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  planId: text("plan_id")
    .notNull()
    .references(() => billingPlansTable.id),
  status: text("status").notNull(), // 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired'
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", {
    withTimezone: true,
  }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  trialEnd: timestamp("trial_end", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const billingInvoicesTable = pgTable("billing_invoices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  idempotencyKey: text("idempotency_key").unique(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  subscriptionId: text("subscription_id").references(
    () => billingSubscriptionsTable.id,
  ),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(), // 'open' | 'paid' | 'void' | 'uncollectible'
  dueDate: timestamp("due_date", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  lineItems: jsonb("line_items")
    .$type<
      Array<{
        description: string;
        quantity: number;
        unitAmountCents: number;
      }>
    >()
    .default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const billingPaymentsTable = pgTable(
  "billing_payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id),
    invoiceId: text("invoice_id").references(() => billingInvoicesTable.id),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull(), // 'pending' | 'succeeded' | 'failed' | 'refunded'
    provider: text("provider").notNull(), // 'payme' | 'click' | 'uzum' | 'stripe' | 'manual'
    providerPaymentId: text("provider_payment_id"),
    failureReason: text("failure_reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    providerPaymentIdUnique: uniqueIndex(
      "billing_payments_provider_payment_id_unique",
    ).on(table.provider, table.providerPaymentId),
  }),
);

export const billingOutboxTable = pgTable(
  "billing_outbox",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventType: text("event_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    pendingIdx: index("billing_outbox_pending_idx").on(
      table.status,
      table.availableAt,
      table.createdAt,
    ),
  }),
);

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type Payment = typeof paymentsTable.$inferSelect;
export type PaymeTransaction = typeof paymeTransactionsTable.$inferSelect;
export type BillingPlan = typeof billingPlansTable.$inferSelect;
export type BillingSubscription = typeof billingSubscriptionsTable.$inferSelect;
export type BillingInvoice = typeof billingInvoicesTable.$inferSelect;
export type BillingPayment = typeof billingPaymentsTable.$inferSelect;
export type BillingOutbox = typeof billingOutboxTable.$inferSelect;
