import type { PlanId, BillingCycle } from "@streamx/api-client";

export type { PlanId, BillingCycle };

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  description: string;
  features: PlanFeature[];
  popular: boolean;
}

export interface FAQ {
  question: string;
  answer: string;
}
