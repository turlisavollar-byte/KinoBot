import { PaymentProvider } from './Payment';

export interface ProviderPaymentParams {
  amount: number;
  merchantTransId: string;
  returnUrl?: string;
}

export interface ParsedWebhook {
  orderId: string;
  transactionId: string;
  status: 'paid' | 'failed' | 'refunded' | 'pending';
  metadata: Record<string, unknown>;
  response: unknown;
}

export interface WebhookContext {
  body: unknown;
  authHeader?: string;
}

export interface IPaymentProvider {
  readonly name: PaymentProvider;
  generatePaymentUrl(params: ProviderPaymentParams): string;
  parseWebhook(ctx: WebhookContext): ParsedWebhook;
}
