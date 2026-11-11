import { subscriptions as subsApi } from "@streamx/api-client";
import type { Subscription, PlanId, BillingCycle } from "@streamx/api-client";

export type { Subscription, PlanId, BillingCycle };

export async function fetchSubscription(): Promise<Subscription | null> {
  return subsApi.get();
}

export async function upsertSubscription(
  planId: PlanId,
  billingCycle: BillingCycle
): Promise<Subscription> {
  return subsApi.upsert(planId, billingCycle);
}

export async function cancelSubscription(): Promise<void> {
  await subsApi.cancel();
}
