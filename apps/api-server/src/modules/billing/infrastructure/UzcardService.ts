/**
 * Uzcard/Humo payment provider service.
 * Implements the Uzcard merchant API protocol for generating
 * payment URLs and verifying incoming webhook callbacks.
 *
 * Uzcard/Humo uses a REST-based webhook system with SHA-1 signature
 * verification (SHA1 of concatenated fields + secret key).
 * Supports both Uzcard and Humo card types.
 */

export interface UzcardWebhookRequest {
  transactionId: string;
  orderId: string;
  amount: number;
  cardType: "uzcard" | "humo";
  status: "success" | "failed" | "refunded" | "pending";
  sign: string;
  timestamp: string;
}

export interface UzcardWebhookResponse {
  status: "ok" | "error";
  message: string;
}

import {
  hasConfiguredSecret,
  isFreshWebhookTimestamp,
  safeSignatureEqual,
} from "./signature";
import { billingConfig } from "./billingConfig";

export class UzcardService {
  constructor(
    private readonly merchantId: string = billingConfig.uzcard.merchantId,
    private readonly terminalId: string = billingConfig.uzcard.terminalId,
    private readonly secretKey: string = billingConfig.uzcard.secretKey,
  ) {}

  /**
   * Generate a Uzcard/Humo checkout payment URL for a given invoice.
   * The user is redirected to this URL to complete payment.
   */
  generatePaymentUrl(params: {
    amount: number;
    orderId: string;
    returnUrl?: string;
  }): string {
    const baseUrl = billingConfig.uzcard.checkoutBaseUrl;
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
   * Verify the SHA-1 signature of an incoming Uzcard/Humo webhook.
   * Sign = SHA1(orderId + transactionId + amount + cardType + status + timestamp + secretKey)
   */
  verifySignature(webhook: UzcardWebhookRequest): boolean {
    if (!hasConfiguredSecret(this.secretKey)) return false;
    if (!isFreshWebhookTimestamp(webhook.timestamp)) return false;
    const crypto = require("crypto");
    const payload = `${webhook.orderId}${webhook.transactionId}${webhook.amount}${webhook.cardType}${webhook.status}${webhook.timestamp}${this.secretKey}`;
    const expectedSign = crypto
      .createHash("sha1")
      .update(payload)
      .digest("hex");
    return safeSignatureEqual(expectedSign, webhook.sign);
  }

  /**
   * Process an incoming Uzcard/Humo webhook.
   */
  handleWebhook(webhook: UzcardWebhookRequest): UzcardWebhookResponse {
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
   * Generate a SHA-1 signature for the given data.
   */
  private generateSignature(data: Record<string, string>): string {
    const crypto = require("crypto");
    const payload =
      Object.keys(data)
        .sort()
        .map((key) => `${key}=${data[key]}`)
        .join("&") + this.secretKey;
    return crypto.createHash("sha1").update(payload).digest("hex");
  }
}
