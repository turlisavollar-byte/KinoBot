/**
 * Anor payment provider service.
 * Implements the Anor Bank merchant API protocol for generating
 * payment URLs and verifying incoming webhook callbacks.
 *
 * Anor uses a REST-based webhook system with SHA-256 signature
 * verification (HMAC of concatenated fields + secret key).
 */

export interface AnorWebhookRequest {
  transactionId: string;
  orderId: string;
  amount: number;
  status: "success" | "failed" | "refunded" | "pending";
  signature: string;
  timestamp: string;
}

export interface AnorWebhookResponse {
  status: "ok" | "error";
  message: string;
}

import {
  hasConfiguredSecret,
  isFreshWebhookTimestamp,
  safeSignatureEqual,
} from "./signature";
import { billingConfig } from "./billingConfig";

export class AnorService {
  constructor(
    private readonly merchantId: string = billingConfig.anor.merchantId,
    private readonly secretKey: string = billingConfig.anor.secretKey,
  ) {}

  /**
   * Generate an Anor checkout payment URL for a given invoice.
   * The user is redirected to this URL to complete payment.
   */
  generatePaymentUrl(params: {
    amount: number;
    orderId: string;
    returnUrl?: string;
  }): string {
    const baseUrl = billingConfig.anor.checkoutBaseUrl;
    const queryParams = new URLSearchParams({
      merchant_id: this.merchantId,
      order_id: params.orderId,
      amount: params.amount.toFixed(2),
    });

    if (params.returnUrl) {
      queryParams.set("return_url", params.returnUrl);
    }

    const signature = this.generateSignature({
      order_id: params.orderId,
      amount: params.amount.toFixed(2),
      merchant_id: this.merchantId,
    });
    queryParams.set("signature", signature);

    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * Verify the SHA-256 HMAC signature of an incoming Anor webhook.
   * Signature = HMAC-SHA256(orderId + transactionId + amount + status + timestamp, secretKey)
   */
  verifySignature(webhook: AnorWebhookRequest): boolean {
    if (!hasConfiguredSecret(this.secretKey)) return false;
    if (!isFreshWebhookTimestamp(webhook.timestamp)) return false;
    const crypto = require("crypto");
    const payload = `${webhook.orderId}${webhook.transactionId}${webhook.amount}${webhook.status}${webhook.timestamp}`;
    const expectedSign = crypto
      .createHmac("sha256", this.secretKey)
      .update(payload)
      .digest("hex");
    return safeSignatureEqual(expectedSign, webhook.signature);
  }

  /**
   * Process an incoming Anor webhook.
   */
  handleWebhook(webhook: AnorWebhookRequest): AnorWebhookResponse {
    if (!this.verifySignature(webhook)) {
      return { status: "error", message: "Invalid signature" };
    }

    if (webhook.status === "success") {
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

  /**
   * Generate an HMAC-SHA256 signature for the given data.
   */
  private generateSignature(data: Record<string, string>): string {
    const crypto = require("crypto");
    const payload = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join("&");
    return crypto
      .createHmac("sha256", this.secretKey)
      .update(payload)
      .digest("hex");
  }
}
