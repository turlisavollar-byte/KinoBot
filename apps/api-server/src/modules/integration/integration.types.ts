export type IntegrationType = "payme" | "click" | "uzum" | "stripe" | "webhook";
export type IntegrationStatus = "active" | "inactive" | "error";

export interface WebhookEvent {
  id: string;
  type: string;
  source: IntegrationType;
  payload: unknown;
  receivedAt: Date;
  processedAt?: Date;
  status: "pending" | "processed" | "failed";
}

export interface PaymentProviderConfig {
  provider: IntegrationType;
  merchantId?: string;
  secretKey?: string;
  callbackUrl?: string;
  testMode: boolean;
}
