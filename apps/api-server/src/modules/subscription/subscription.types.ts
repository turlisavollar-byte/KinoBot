export type PaymentStatus = "pending" | "completed" | "failed" | "refunded" | "cancelled";
export type PaymentProvider = "payme" | "click" | "uzum" | "stripe" | "manual";
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired';
export type BillingInterval = 'monthly' | 'yearly' | 'one_time';

export interface PaymentFilters {
  userId?: string;
  status?: PaymentStatus;
  provider?: PaymentProvider;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CreatePaymentDTO {
  userId: string;
  subscriptionId?: string;
  amount: number;
  currency?: string;
  provider: PaymentProvider;
  description?: string;
}

export interface RefundDTO {
  reason?: string;
  amount?: number;
}

export interface RevenueStats {
  totalRevenue: number;
  revenueToday: number;
  revenueThisMonth: number;
  transactionCount: number;
  currency: string;
}
