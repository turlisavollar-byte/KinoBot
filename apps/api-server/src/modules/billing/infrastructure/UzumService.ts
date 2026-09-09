/**
 * Uzum payment provider service.
 * Implements the Uzum Checkout merchant API protocol for generating
 * payment URLs and verifying incoming webhook callbacks.
 *
 * Uzum uses a REST-based webhook system with HMAC-SHA256 signature
 * verification.
 */

export interface UzumWebhookRequest {
  orderId: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: "success" | "failed" | "refunded" | "pending";
  signature: string;
  timestamp: string;
}

export interface UzumWebhookResponse {
  status: "ok" | "error";
  message: string;
}

import {
  hasConfiguredSecret,
  isFreshWebhookTimestamp,
  safeSignatureEqual,
} from "./signature";
import { billingConfig } from "./billingConfig";

export class UzumService {
  constructor(
    private readonly merchantId: string = billingConfig.uzum.merchantId,
    private readonly secretKey: string = billingConfig.uzum.secretKey,
    private readonly terminalId: string = billingConfig.uzum.terminalId,
  ) {}

  /**
   * Generate a Uzum checkout payment URL for a given invoice.
   * The user is redirected to this URL to complete payment.
   */
  generatePaymentUrl(params: {
    amount: number;
    orderId: string;
    returnUrl?: string;
  }): string {
    const baseUrl = billingConfig.uzum.checkoutBaseUrl;
    const queryParams = new URLSearchParams({
      merchant_id: this.merchantId,
      terminal_id: this.terminalId,
      order_id: params.orderId,
      amount: params.amount.toFixed(2),
    });

    if (params.returnUrl) {
      queryParams.set("return_url", params.returnUrl);
    }

    const signature = this.generateSignature({
      order_id: params.orderId,
      amount: params.amount.toFixed(2),
      terminal_id: this.terminalId,
    });
    queryParams.set("signature", signature);

    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * Verify the HMAC-SHA256 signature of an incoming Uzum webhook.
   * Signature = HMAC-SHA256(orderId + transactionId + amount + status + timestamp, secretKey)
   */
  verifySignature(webhook: UzumWebhookRequest): boolean {
    if (!hasConfiguredSecret(this.secretKey)) return false;
    if (!isFreshWebhookTimestamp(webhook.timestamp)) return false;
    const payload = `${webhook.orderId}${webhook.transactionId}${webhook.amount}${webhook.status}${webhook.timestamp}`;
    const expectedSign = this.generateSignature({ payload });
    return safeSignatureEqual(expectedSign, webhook.signature);
  }

  /**
   * Process an incoming Uzum webhook.
   */
  handleWebhook(webhook: UzumWebhookRequest): UzumWebhookResponse {
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
  private generateSignature(
    data: Record<string, string> | { payload: string },
  ): string {
    const crypto = require("crypto");
    let payload: string;

    if ("payload" in data) {
      payload = data.payload;
    } else {
      payload = Object.keys(data)
        .sort()
        .map((key) => `${key}=${data[key]}`)
        .join("&");
    }

    return crypto
      .createHmac("sha256", this.secretKey)
      .update(payload)
      .digest("hex");
  }
}
