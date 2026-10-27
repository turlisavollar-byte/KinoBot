import type { BillingCycle } from "@streamx/api-client";

const YEARLY_DISCOUNT = 0.8;

export function formatPrice(price: number, cycle: BillingCycle): string {
  const adjusted = cycle === "yearly" ? price * YEARLY_DISCOUNT : price;
  return `$${adjusted.toFixed(2)}`;
}
