/**
 * Payme (Paycom) payment provider service.
 * Implements the Payme merchant API protocol for generating payment URLs
 * and handling JSON-RPC 2.0 webhook calls (CheckTransaction, CreateTransaction,
 * PerformTransaction, CancelTransaction, GetStatement).
 *
 * Docs: https://developer.help.paycom.uz/
 */

export interface PaymeWebhookRequest {
  id: number | string;
  method: string;
  params: Record<string, unknown>;
}

export interface PaymeWebhookResponse {
  id: number | string;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
    data?: string;
  };
}

import { hasConfiguredSecret, safeSignatureEqual } from "./signature";
import { billingConfig } from "./billingConfig";

export class PaymeService {
  constructor(
    private readonly merchantId: string = billingConfig.payme.merchantId,
    private readonly secretKey: string = billingConfig.payme.secretKey,
  ) {}

  /**
   * Generate a Payme checkout URL for a given invoice.
   * The user is redirected to this URL to complete payment.
   */
  generatePaymentUrl(params: {
    amount: number;
    merchantTransId: string;
    returnUrl?: string;
  }): string {
    const baseUrl = billingConfig.payme.checkoutBaseUrl;
    const paramsStr = `m=${this.merchantId};ac.${params.merchantTransId};a=${params.amount}`;

    if (params.returnUrl) {
      return `${baseUrl}/${this.encodeBase64(paramsStr + ";cr=" + params.returnUrl)}`;
    }

    return `${baseUrl}/${this.encodeBase64(paramsStr)}`;
  }

  /**
   * Verify the Authorization header from a Payme webhook request.
   * Payme sends "Basic base64(merchant_id:secret_key)" — but for the
   * merchant API, it's just the secret key in the header.
   */
  verifyAuth(authHeader: string | undefined): boolean {
    if (!authHeader || !hasConfiguredSecret(this.secretKey)) return false;

    const base64Part = authHeader.replace("Basic ", "").trim();
    const decoded = this.decodeBase64(base64Part);

    // Payme sends "Paycom:secret_key"
    const parts = decoded.split(":");
    if (parts.length !== 2) return false;

    const merchantId = parts[0];
    const password = parts[1];

    return (
      merchantId === "Paycom" && safeSignatureEqual(password, this.secretKey)
    );
  }

  /**
   * Handle the full JSON-RPC 2.0 webhook from Payme.
   * Routes to the appropriate method handler.
   */
  handleWebhook(request: PaymeWebhookRequest): PaymeWebhookResponse {
    const { id, method, params } = request;

    switch (method) {
      case "CheckTransaction":
        return this.checkTransaction(id, params);
      case "CreateTransaction":
        return this.createTransaction(id, params);
      case "PerformTransaction":
        return this.performTransaction(id, params);
      case "CancelTransaction":
        return this.cancelTransaction(id, params);
      case "GetStatement":
        return this.getStatement(id, params);
      default:
        return {
          id,
          error: {
            code: -32601,
            message: "Method not found",
            data: method,
          },
        };
    }
  }

  private checkTransaction(
    id: number | string,
    params: Record<string, unknown>,
  ): PaymeWebhookResponse {
    const merchantTransId = params["account"] as string | undefined;
    if (!merchantTransId) {
      return { id, error: { code: -31050, message: "Invalid account" } };
    }

    return {
      id,
      result: {
        create_time: Date.now(),
        transaction: params["id"] || "",
        state: 1,
      },
    };
  }

  private createTransaction(
    id: number | string,
    params: Record<string, unknown>,
  ): PaymeWebhookResponse {
    const merchantTransId = params["account"] as string | undefined;
    const amount = params["amount"] as number | undefined;

    if (!merchantTransId) {
      return { id, error: { code: -31050, message: "Invalid account" } };
    }

    if (amount === undefined || amount <= 0) {
      return { id, error: { code: -31001, message: "Invalid amount" } };
    }

    return {
      id,
      result: {
        create_time: Date.now(),
        transaction: crypto.randomUUID(),
        state: 1,
      },
    };
  }

  private performTransaction(
    id: number | string,
    params: Record<string, unknown>,
  ): PaymeWebhookResponse {
    const transaction = params["transaction"] as string | undefined;
    if (!transaction) {
      return { id, error: { code: -31003, message: "Transaction not found" } };
    }

    return {
      id,
      result: {
        perform_time: Date.now(),
        transaction,
        state: 2,
      },
    };
  }

  private cancelTransaction(
    id: number | string,
    params: Record<string, unknown>,
  ): PaymeWebhookResponse {
    const transaction = params["transaction"] as string | undefined;
    if (!transaction) {
      return { id, error: { code: -31003, message: "Transaction not found" } };
    }

    return {
      id,
      result: {
        cancel_time: Date.now(),
        transaction,
        state: -1,
      },
    };
  }

  private getStatement(
    id: number | string,
    params: Record<string, unknown>,
  ): PaymeWebhookResponse {
    return {
      id,
      result: {
        transactions: [],
      },
    };
  }

  private encodeBase64(str: string): string {
    return Buffer.from(str, "utf-8").toString("base64");
  }

  private decodeBase64(str: string): string {
    return Buffer.from(str, "base64").toString("utf-8");
  }
}
