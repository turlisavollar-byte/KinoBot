/**
 * NBU (National Bank of Uzbekistan) payment provider service.
 * Implements the NBU merchant API protocol for generating
 * payment URLs and verifying incoming webhook callbacks.
 *
 * NBU uses a REST-based webhook system with SHA-256 signature
 * verification (RSA-SHA256 of concatenated fields + secret key).
 */

export interface NBUWebhookRequest {
  transactionId: string;
  orderId: string;
  amount: number;
  status: "paid" | "failed" | "refunded" | "pending";
  sign: string;
  timestamp: string;
}

export interface NBUWebhookResponse {
  status: "ok" | "error";
  message: string;
}

import {
  hasConfiguredSecret,
  isFreshWebhookTimestamp,
  safeSignatureEqual,
} from "./signature";
import { billingConfig } from "./billingConfig";

export class NBUService {
  constructor(
    private readonly merchantId: string = billingConfig.nbu.merchantId,
    private readonly terminalId: string = billingConfig.nbu.terminalId,
    private readonly secretKey: string = billingConfig.nbu.secretKey,
  ) {}

  /**
   * Generate an NBU checkout payment URL for a given invoice.
   * The user is redirected to this URL to complete payment.
   */
  generatePaymentUrl(params: {
    amount: number;
    orderId: string;
    returnUrl?: string;
  }): string {
    const baseUrl = billingConfig.nbu.checkoutBaseUrl;
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
    queryParams.set("sign", signature);

    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * Verify the SHA-256 signature of an incoming NBU webhook.
   * Sign = SHA256(orderId + transactionId + amount + status + timestamp + secretKey)
   */
  verifySignature(webhook: NBUWebhookRequest): boolean {
    if (!hasConfiguredSecret(this.secretKey)) return false;
    if (!isFreshWebhookTimestamp(webhook.timestamp)) return false;
    const crypto = require("crypto");
    const payload = `${webhook.orderId}${webhook.transactionId}${webhook.amount}${webhook.status}${webhook.timestamp}${this.secretKey}`;
    const expectedSign = crypto
      .createHash("sha256")
      .update(payload)
      .digest("hex");
    return safeSignatureEqual(expectedSign, webhook.sign);
  }

  /**
   * Process an incoming NBU webhook.
   */
  handleWebhook(webhook: NBUWebhookRequest): NBUWebhookResponse {
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

  /**
   * Generate a SHA-256 signature for the given data.
   */
  private generateSignature(data: Record<string, string>): string {
    const crypto = require("crypto");
    const payload =
      Object.keys(data)
        .sort()
        .map((key) => `${key}=${data[key]}`)
        .join("&") + this.secretKey;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }
}
