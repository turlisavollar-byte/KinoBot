import { inject, injectable } from "tsyringe";
import type { IPaymentRepository, IInvoiceRepository } from "../domain";
import { Payment } from "../domain";
import {
  PaymeService,
  PaymeWebhookRequest,
} from "../infrastructure/PaymeService";
import { NotFoundError } from "@/shared/errors";
import { persistSuccessfulPayment } from "./persistSuccessfulPayment";
import { providerAmountMatchesInvoice } from "./providerAmount";

@injectable()
export class HandlePaymeWebhookUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly paymentRepo: IPaymentRepository,
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(PaymeService)
    private readonly paymeService: PaymeService,
  ) {}

  async execute(
    authHeader: string | undefined,
    request: PaymeWebhookRequest,
  ): Promise<{
    id: number | string;
    result?: Record<string, unknown>;
    error?: { code: number; message: string; data?: string };
  }> {
    if (!this.paymeService.verifyAuth(authHeader)) {
      return {
        id: request.id,
        error: { code: -32504, message: "Access denied — invalid credentials" },
      };
    }

    const { id, method, params } = request;

    if (method === "PerformTransaction") {
      return this.handlePerform(id, params);
    }

    if (method === "CancelTransaction") {
      return this.handleCancel(id, params);
    }

    return this.paymeService.handleWebhook(request);
  }

  private async handlePerform(
    id: number | string,
    params: Record<string, unknown>,
  ): Promise<{
    id: number | string;
    result?: Record<string, unknown>;
    error?: { code: number; message: string; data?: string };
  }> {
    const transaction = params["transaction"] as string | undefined;
    if (!transaction) {
      return { id, error: { code: -31003, message: "Transaction not found" } };
    }

    const invoice = await this.invoiceRepo.findById(transaction);
    if (!invoice) {
      return { id, error: { code: -31050, message: "Invoice not found" } };
    }
    const amount = params["amount"];
    if (
      amount !== undefined &&
      !providerAmountMatchesInvoice(invoice.amountCents, Number(amount), 1)
    ) {
      return { id, error: { code: -31001, message: "Amount mismatch" } };
    }
    const payment = Payment.create({
      userId: invoice.userId,
      invoiceId: invoice.id,
      amountCents: invoice.amountCents,
      currency: "uzs",
      provider: "payme",
      providerPaymentId: transaction,
      metadata: { payme_transaction: transaction },
    });
    payment.markSucceeded(transaction);
    const persisted = await persistSuccessfulPayment(
      this.paymentRepo,
      this.invoiceRepo,
      invoice,
      payment,
    );
    if (!persisted) {
      return {
        id,
        error: { code: -31008, message: "Invoice is not in open state" },
      };
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

  private async handleCancel(
    id: number | string,
    params: Record<string, unknown>,
  ): Promise<{
    id: number | string;
    result?: Record<string, unknown>;
    error?: { code: number; message: string; data?: string };
  }> {
    const transaction = params["transaction"] as string | undefined;
    if (!transaction) {
      return { id, error: { code: -31003, message: "Transaction not found" } };
    }

    const payments = await this.paymentRepo.findByInvoiceId(transaction);
    const paymePayment = payments.find((p) => p.provider === "payme");

    if (paymePayment && paymePayment.isSucceeded()) {
      paymePayment.refund();
      await this.paymentRepo.update(paymePayment);
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
}
