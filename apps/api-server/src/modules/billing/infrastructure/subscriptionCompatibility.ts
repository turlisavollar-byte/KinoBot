import { and, desc, eq, gt, inArray } from "drizzle-orm";
import {
  db,
  billingPlansTable,
  billingSubscriptionsTable,
  subscriptionPlansTable,
  subscriptionsTable,
} from "@workspace/db";

export type SubscriptionSource = "billing" | "legacy";
export type SubscriptionTableName = "billing_subscriptions" | "subscriptions";

export interface ActiveSubscriptionSnapshot {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate?: Date | null;
  endDate?: Date | null;
  source: SubscriptionSource;
  table: SubscriptionTableName;
}

export function pickCanonicalSubscriptionSource(
  billing: ActiveSubscriptionSnapshot | null,
  legacy: ActiveSubscriptionSnapshot | null,
): ActiveSubscriptionSnapshot | null {
  if (billing) {
    return {
      ...billing,
      source: "billing",
      table: "billing_subscriptions",
    };
  }

  if (legacy) {
    return {
      ...legacy,
      source: "legacy",
      table: "subscriptions",
    };
  }

  return null;
}

export async function resolveActiveSubscriptionSnapshot(
  userId: string,
): Promise<ActiveSubscriptionSnapshot | null> {
  const now = new Date();

  const [billingRow] = await db
    .select({
      id: billingSubscriptionsTable.id,
      userId: billingSubscriptionsTable.userId,
      planId: billingSubscriptionsTable.planId,
      status: billingSubscriptionsTable.status,
      startDate: billingSubscriptionsTable.currentPeriodStart,
      endDate: billingSubscriptionsTable.currentPeriodEnd,
    })
    .from(billingSubscriptionsTable)
    .where(
      and(
        eq(billingSubscriptionsTable.userId, userId),
        inArray(billingSubscriptionsTable.status, ["active", "trialing"]),
        gt(billingSubscriptionsTable.currentPeriodEnd, now),
      ),
    )
    .orderBy(desc(billingSubscriptionsTable.currentPeriodEnd))
    .limit(1);

  if (billingRow) {
    return {
      id: billingRow.id,
      userId: billingRow.userId,
      planId: billingRow.planId,
      status: billingRow.status,
      startDate: billingRow.startDate,
      endDate: billingRow.endDate,
      source: "billing",
      table: "billing_subscriptions",
    };
  }

  const [legacyRow] = await db
    .select({
      id: subscriptionsTable.id,
      userId: subscriptionsTable.userId,
      planId: subscriptionsTable.planId,
      status: subscriptionsTable.status,
      startDate: subscriptionsTable.startDate,
      endDate: subscriptionsTable.endDate,
    })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.userId, userId),
        eq(subscriptionsTable.status, "active"),
        gt(subscriptionsTable.endDate, now),
      ),
    )
    .orderBy(desc(subscriptionsTable.endDate))
    .limit(1);

  if (legacyRow) {
    return {
      id: legacyRow.id,
      userId: legacyRow.userId,
      planId: legacyRow.planId,
      status: legacyRow.status,
      startDate: legacyRow.startDate,
      endDate: legacyRow.endDate,
      source: "legacy",
      table: "subscriptions",
    };
  }

  return null;
}

export async function resolveActiveSubscriptionPlan(
  userId: string,
): Promise<{
  planId: string | null;
  source: SubscriptionSource;
  table: SubscriptionTableName;
} | null> {
  const active = await resolveActiveSubscriptionSnapshot(userId);
  if (!active) return null;

  const isBilling = active.table === "billing_subscriptions";
  const planTable = isBilling ? billingPlansTable : subscriptionPlansTable;
  const planId = active.planId;

  const [plan] = await db
    .select({ id: planTable.id })
    .from(planTable)
    .where(eq(planTable.id, planId))
    .limit(1);

  if (!plan) return null;

  return {
    planId: plan.id,
    source: active.source,
    table: active.table,
  };
}
