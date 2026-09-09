/**
 * Click payment provider service.
 * Implements the Click merchant API protocol for generating payment URLs
 * and verifying incoming webhook callbacks.
 *
 * Docs: https://docs.click.uz/
 */

export interface ClickPrepareParams {
  merchantTransId: string;
  amount: number;
  userId: string;
  merchantPrepareId: string;
  signString: string;
}

export interface ClickCompleteParams {
  merchantPrepareId: string;
  merchantTransId: string;
  amount: number;
  userId: string;
  signString: string;
  error: number;
}

export interface ClickWebhookRequest {
  click_trans_id: number;
  service_id: number;
  click_paydoc_id: number;
  merchant_trans_id: string;
  amount: number;
  action: number;
  error: number;
  sign_time: string;
  sign_string: string;
}

export interface ClickWebhookResponse {
  error: number;
  error_note: string;
  merchant_prepare_id?: string | number;
  merchant_trans_id?: string;
}

import type { ProviderPaymentParams } from "../domain";
import {
  hasConfiguredSecret,
  isFreshWebhookTimestamp,
  safeSignatureEqual,
} from "./signature";
import { billingConfig } from "./billingConfig";

export class ClickService {
  readonly name = "click" as const;

  constructor(
    private readonly merchantId: string = billingConfig.click.merchantId,
    private readonly serviceId: string = billingConfig.click.serviceId,
    private readonly secretKey: string = billingConfig.click.secretKey,
    private readonly merchantUserId: string = billingConfig.click
      .merchantUserId,
  ) {}

  generatePaymentUrl(params: ProviderPaymentParams): string {
    const baseUrl = billingConfig.click.checkoutBaseUrl;
    const queryParams = new URLSearchParams({
      service_id: this.serviceId,
      merchant_id: this.merchantId,
      amount: params.amount.toFixed(2),
      merchant_trans_id: params.merchantTransId,
      merchant_user_id: this.merchantUserId,
    });

    if (params.returnUrl) {
      queryParams.set("return_url", params.returnUrl);
    }

    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * Verify the MD5 signature of an incoming Click webhook.
   * Sign string = MD5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
   */
  verifySignature(webhook: ClickWebhookRequest): boolean {
    if (!hasConfiguredSecret(this.secretKey)) return false;
    if (!isFreshWebhookTimestamp(webhook.sign_time)) return false;
    const signString = `${webhook.click_trans_id}${webhook.service_id}${this.secretKey}${webhook.merchant_trans_id}${webhook.amount}${webhook.action}${webhook.sign_time}`;
    const crypto = require("crypto");
    const expectedSign = crypto
      .createHash("md5")
      .update(signString)
      .digest("hex");
    return safeSignatureEqual(expectedSign, webhook.sign_string);
  }

  /**
   * Process a PREPARE (action=0) webhook from Click.
   * This is the first phase — Click asks the merchant to prepare the payment.
   */
  handlePrepare(webhook: ClickWebhookRequest): ClickWebhookResponse {
    if (!this.verifySignature(webhook)) {
      return { error: -1, error_note: "Invalid signature" };
    }

    if (webhook.service_id.toString() !== this.serviceId) {
      return { error: -2, error_note: "Invalid service ID" };
    }

    if (webhook.error !== 0) {
      return { error: webhook.error, error_note: "Click-side error" };
    }

    return {
      error: 0,
      error_note: "Success",
      merchant_prepare_id: webhook.merchant_trans_id,
      merchant_trans_id: webhook.merchant_trans_id,
    };
  }

  /**
   * Process a COMPLETE (action=1) webhook from Click.
   * This is the second phase — Click confirms the payment was completed.
   */
  handleComplete(webhook: ClickWebhookRequest): ClickWebhookResponse {
    if (!this.verifySignature(webhook)) {
      return { error: -1, error_note: "Invalid signature" };
    }

    if (webhook.service_id.toString() !== this.serviceId) {
      return { error: -2, error_note: "Invalid service ID" };
    }

    if (webhook.error !== 0) {
      return {
        error: webhook.error,
        error_note: "Payment failed on Click side",
      };
    }

    return {
      error: 0,
      error_note: "Success",
      merchant_trans_id: webhook.merchant_trans_id,
    };
  }
}
