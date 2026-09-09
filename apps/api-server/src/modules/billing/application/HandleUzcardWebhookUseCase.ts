import { inject, injectable } from "tsyringe";
import type { IPaymentRepository, IInvoiceRepository } from "../domain";
import { Payment } from "../domain";
import {
  UzcardService,
  UzcardWebhookRequest,
} from "../infrastructure/UzcardService";
import { NotFoundError } from "@/shared/errors";
import { persistSuccessfulPayment } from "./persistSuccessfulPayment";
import { providerAmountMatchesInvoice } from "./providerAmount";

@injectable()
export class HandleUzcardWebhookUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly paymentRepo: IPaymentRepository,
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(UzcardService)
    private readonly uzcardService: UzcardService,
  ) {}

  async execute(
    webhook: UzcardWebhookRequest,
  ): Promise<{ status: "ok" | "error"; message: string }> {
    const result = this.uzcardService.handleWebhook(webhook);
    if (result.status === "error") return result;

    const invoice = await this.invoiceRepo.findById(webhook.orderId);
    if (!invoice) return { status: "error", message: "Invoice not found" };
    if (!providerAmountMatchesInvoice(invoice.amountCents, webhook.amount)) {
      return { status: "error", message: "Amount mismatch" };
    }

    if (webhook.status === "success") {
      const payment = Payment.create({
        userId: invoice.userId,
        invoiceId: invoice.id,
        amountCents: invoice.amountCents,
        currency: "uzs",
        provider: "uzcard",
        providerPaymentId: webhook.transactionId,
        metadata: {
          uzcard_order_id: webhook.orderId,
          uzcard_transaction_id: webhook.transactionId,
          card_type: webhook.cardType,
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
      const uzcardPayment = payments.find(
        (p) => p.provider === "uzcard" && p.isSucceeded(),
      );
      if (uzcardPayment) {
        uzcardPayment.refund();
        await this.paymentRepo.update(uzcardPayment);
      }
    }

    return result;
  }
}
