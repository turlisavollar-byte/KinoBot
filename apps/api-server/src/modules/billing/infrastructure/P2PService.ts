import {
  hasConfiguredSecret,
  isFreshWebhookTimestamp,
  safeSignatureEqual,
} from "./signature";
import { billingConfig } from "./billingConfig";

export interface P2PWebhookRequest {
  transactionId: string;
  orderId: string;
  amount: number;
  status: "paid" | "failed" | "refunded" | "pending";
  timestamp: string;
  signature: string;
}

export interface P2PWebhookResponse {
  status: "ok" | "error";
  message: string;
}

export class P2PService {
  constructor(
    private readonly merchantId: string = billingConfig.p2p.merchantId,
    private readonly secretKey: string = billingConfig.p2p.secretKey,
  ) {}

  generatePaymentUrl(params: {
    amount: number;
    orderId: string;
    returnUrl?: string;
  }): string {
    const baseUrl =
      billingConfig.p2p.checkoutBaseUrl || billingConfig.p2p.apiUrl;
    const query = new URLSearchParams({
      merchant_id: this.merchantId,
      order_id: params.orderId,
      amount: params.amount.toFixed(2),
    });

    if (params.returnUrl) query.set("return_url", params.returnUrl);

    const signature = this.generateSignature({
      order_id: params.orderId,
      amount: params.amount.toFixed(2),
      transaction_id: params.orderId,
    });
    query.set("signature", signature);

    return `${baseUrl}?${query.toString()}`;
  }

  verifySignature(webhook: P2PWebhookRequest): boolean {
    if (!hasConfiguredSecret(this.secretKey)) return false;
    if (!isFreshWebhookTimestamp(webhook.timestamp)) return false;

    const expected = this.generateSignature({
      order_id: webhook.orderId,
      transaction_id: webhook.transactionId,
      amount: String(webhook.amount),
      status: webhook.status,
      timestamp: webhook.timestamp,
    });

    return safeSignatureEqual(expected, webhook.signature);
  }

  handleWebhook(webhook: P2PWebhookRequest): P2PWebhookResponse {
    if (!this.verifySignature(webhook)) {
      return { status: "error", message: "Invalid signature" };
    }

    if (webhook.status === "paid") {
      return { status: "ok", message: "Payment confirmed" };
    }

    if (webhook.status === "failed") {
      return { status: "ok", message: "Payment failure acknowledged" };
    }

    if (webhook.status === "refunded") {
      return { status: "ok", message: "Refund acknowledged" };
    }

    return { status: "ok", message: "Webhook acknowledged" };
  }

  private generateSignature(data: Record<string, string>): string {
    const crypto = require("crypto");
    const ordered = [
      data.order_id ?? "",
      data.transaction_id ?? "",
      data.amount ?? "",
      data.status ?? "",
      data.timestamp ?? "",
      this.secretKey,
    ].join("|");

    return crypto.createHash("sha256").update(ordered).digest("hex");
  }
}
