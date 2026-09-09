/**
 * Paynet payment provider service.
 * Implements the Paynet merchant API protocol for generating
 * payment URLs and verifying incoming webhook callbacks.
 *
 * Paynet uses a REST-based webhook system with SHA-1 signature
 * verification (MD5 of concatenated fields + secret key).
 */

export interface PaynetWebhookRequest {
  transactionId: string;
  orderId: string;
  amount: number;
  status: "paid" | "failed" | "refunded" | "pending";
  sign: string;
  timestamp: string;
}

export interface PaynetWebhookResponse {
  status: "ok" | "error";
  message: string;
}

import {
  hasConfiguredSecret,
  isFreshWebhookTimestamp,
  safeSignatureEqual,
} from "./signature";
import { billingConfig } from "./billingConfig";

export class PaynetService {
  constructor(
    private readonly merchantId: string = billingConfig.paynet.merchantId,
    private readonly serviceId: string = billingConfig.paynet.serviceId,
    private readonly secretKey: string = billingConfig.paynet.secretKey,
  ) {}

  /**
   * Generate a Paynet checkout payment URL for a given invoice.
   * The user is redirected to this URL to complete payment.
   */
  generatePaymentUrl(params: {
    amount: number;
    orderId: string;
    returnUrl?: string;
  }): string {
    const baseUrl = billingConfig.paynet.checkoutBaseUrl;
    const queryParams = new URLSearchParams({
      merchant_id: this.merchantId,
      service_id: this.serviceId,
      order_id: params.orderId,
      amount: params.amount.toFixed(2),
    });

    if (params.returnUrl) {
      queryParams.set("return_url", params.returnUrl);
    }

    const signature = this.generateSignature({
      order_id: params.orderId,
      amount: params.amount.toFixed(2),
      service_id: this.serviceId,
    });
    queryParams.set("sign", signature);

    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * Verify the MD5 signature of an incoming Paynet webhook.
   * Sign = MD5(orderId + transactionId + amount + status + timestamp + secretKey)
   */
  verifySignature(webhook: PaynetWebhookRequest): boolean {
    if (!hasConfiguredSecret(this.secretKey)) return false;
    if (!isFreshWebhookTimestamp(webhook.timestamp)) return false;
    const crypto = require("crypto");
    const payload = `${webhook.orderId}${webhook.transactionId}${webhook.amount}${webhook.status}${webhook.timestamp}${this.secretKey}`;
    const expectedSign = crypto.createHash("md5").update(payload).digest("hex");
    return safeSignatureEqual(expectedSign, webhook.sign);
  }

  /**
   * Process an incoming Paynet webhook.
   */
  handleWebhook(webhook: PaynetWebhookRequest): PaynetWebhookResponse {
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
   * Generate an MD5 signature for the given data.
   */
  private generateSignature(data: Record<string, string>): string {
    const crypto = require("crypto");
    const payload =
      Object.keys(data)
        .sort()
        .map((key) => `${key}=${data[key]}`)
        .join("&") + this.secretKey;
    return crypto.createHash("md5").update(payload).digest("hex");
  }
}
