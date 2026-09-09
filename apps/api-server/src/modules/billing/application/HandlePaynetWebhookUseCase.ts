import { inject, injectable } from "tsyringe";
import type { IPaymentRepository, IInvoiceRepository } from "../domain";
import { Payment } from "../domain";
import {
  PaynetService,
  PaynetWebhookRequest,
} from "../infrastructure/PaynetService";
import { NotFoundError } from "@/shared/errors";
import { persistSuccessfulPayment } from "./persistSuccessfulPayment";
import { providerAmountMatchesInvoice } from "./providerAmount";

@injectable()
export class HandlePaynetWebhookUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly paymentRepo: IPaymentRepository,
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(PaynetService)
    private readonly paynetService: PaynetService,
  ) {}

  async execute(
    webhook: PaynetWebhookRequest,
  ): Promise<{ status: "ok" | "error"; message: string }> {
    const result = this.paynetService.handleWebhook(webhook);
    if (result.status === "error") return result;

    const invoice = await this.invoiceRepo.findById(webhook.orderId);
    if (!invoice) return { status: "error", message: "Invoice not found" };
    if (!providerAmountMatchesInvoice(invoice.amountCents, webhook.amount)) {
      return { status: "error", message: "Amount mismatch" };
    }

    if (webhook.status === "paid") {
      const payment = Payment.create({
        userId: invoice.userId,
        invoiceId: invoice.id,
        amountCents: invoice.amountCents,
        currency: "uzs",
        provider: "paynet",
        providerPaymentId: webhook.transactionId,
        metadata: {
          paynet_order_id: webhook.orderId,
          paynet_transaction_id: webhook.transactionId,
          timestamp: webhook.timestamp,
        },
      });
      payment.markSucceeded(webhook.transactionId);
      await persistSuccessfulPayment(
        this.paymentRepo,
        this.invoiceRepo,
        invoice,
        payment,
      );
    }

    if (webhook.status === "refunded") {
      const payments = await this.paymentRepo.findByInvoiceId(invoice.id);
      const paynetPayment = payments.find(
        (p) => p.provider === "paynet" && p.isSucceeded(),
      );
      if (paynetPayment) {
        paynetPayment.refund();
        await this.paymentRepo.update(paynetPayment);
      }
    }

    return result;
  }
}
