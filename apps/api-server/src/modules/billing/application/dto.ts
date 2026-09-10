import { z } from 'zod';

// ==================== Plans ====================
export const CreatePlanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().min(0, 'Price must be >= 0'),
  currency: z.string().min(3).max(3).optional().default('usd'),
  interval: z.enum(['monthly', 'yearly', 'one_time']),
  metadata: z.record(z.unknown()).optional().default({}),
});
export type CreatePlanDTO = z.infer<typeof CreatePlanSchema>;

export const UpdatePlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type UpdatePlanDTO = z.infer<typeof UpdatePlanSchema>;

export const PlanIdSchema = z.object({
  id: z.string().uuid('Invalid plan ID'),
});

export const ListPlansQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  active_only: z.string().optional(),
});

// ==================== Subscriptions ====================
export const CreateSubscriptionSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  planId: z.string().uuid('Invalid plan ID'),
  trialDays: z.number().int().min(0).max(365).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});
export type CreateSubscriptionDTO = z.infer<typeof CreateSubscriptionSchema>;

export const CancelSubscriptionSchema = z.object({
  id: z.string().uuid('Invalid subscription ID'),
  immediate: z.boolean().optional().default(false),
});
export type CancelSubscriptionDTO = z.infer<typeof CancelSubscriptionSchema>;

export const ExtendSubscriptionSchema = z.object({
  id: z.string().uuid('Invalid subscription ID'),
  days: z.number().int().min(1, 'Days must be at least 1').max(365, 'Days cannot exceed 365'),
});
export type ExtendSubscriptionDTO = z.infer<typeof ExtendSubscriptionSchema>;

export const SubscriptionIdSchema = z.object({
  id: z.string().uuid('Invalid subscription ID'),
});

export const ListSubscriptionsQuerySchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// ==================== Invoices ====================
export const CreateInvoiceSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  subscriptionId: z.string().uuid().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1).max(200),
    quantity: z.number().int().min(1),
    unitAmountCents: z.number().int().min(0),
  })).min(1, 'At least one line item is required'),
  currency: z.string().min(3).max(3).optional().default('usd'),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});
export type CreateInvoiceDTO = z.infer<typeof CreateInvoiceSchema>;

export const InvoiceIdSchema = z.object({
  id: z.string().uuid('Invalid invoice ID'),
});

export const ListInvoicesQuerySchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// ==================== Payments ====================
export const CreatePaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amountCents: z.number().int().min(0),
  currency: z.string().min(3).max(3).optional().default('usd'),
  provider: z.enum(['manual', 'stripe', 'paypal', 'click', 'payme', 'uzum', 'paynet', 'anor', 'nbu', 'uzcard', 'octo']).optional().default('manual'),
  providerPaymentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});
export type CreatePaymentDTO = z.infer<typeof CreatePaymentSchema>;

export const PaymentIdSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
});

export const RefundPaymentSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
});

export const ListPaymentsQuerySchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// ==================== Click ====================
export const CreateClickPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  returnUrl: z.string().url().optional(),
});
export type CreateClickPaymentDTO = z.infer<typeof CreateClickPaymentSchema>;

// ==================== Payme ====================
export const CreatePaymePaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  returnUrl: z.string().url().optional(),
});
export type CreatePaymePaymentDTO = z.infer<typeof CreatePaymePaymentSchema>;

// ==================== Uzum ====================
export const CreateUzumPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  returnUrl: z.string().url().optional(),
});
export type CreateUzumPaymentDTO = z.infer<typeof CreateUzumPaymentSchema>;

// ==================== Paynet ====================
export const CreatePaynetPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  returnUrl: z.string().url().optional(),
});
export type CreatePaynetPaymentDTO = z.infer<typeof CreatePaynetPaymentSchema>;

// ==================== Anor ====================
export const CreateAnorPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  returnUrl: z.string().url().optional(),
});
export type CreateAnorPaymentDTO = z.infer<typeof CreateAnorPaymentSchema>;

// ==================== NBU ====================
export const CreateNBUPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  returnUrl: z.string().url().optional(),
});
export type CreateNBUPaymentDTO = z.infer<typeof CreateNBUPaymentSchema>;

// ==================== Uzcard/Humo ====================
export const CreateUzcardPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  returnUrl: z.string().url().optional(),
});
export type CreateUzcardPaymentDTO = z.infer<typeof CreateUzcardPaymentSchema>;

// ==================== Octo ====================
export const CreateOctoPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  returnUrl: z.string().url().optional(),
});
export type CreateOctoPaymentDTO = z.infer<typeof CreateOctoPaymentSchema>;
