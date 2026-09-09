import { inject, injectable } from "tsyringe";
import type { IPaymentRepository, IInvoiceRepository } from "../domain";
import { Payment } from "../domain";
import { AnorService, AnorWebhookRequest } from "../infrastructure/AnorService";
import { NotFoundError } from "@/shared/errors";
import { persistSuccessfulPayment } from "./persistSuccessfulPayment";
import { providerAmountMatchesInvoice } from "./providerAmount";

@injectable()
export class HandleAnorWebhookUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly paymentRepo: IPaymentRepository,
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(AnorService)
    private readonly anorService: AnorService,
  ) {}

  async execute(
    webhook: AnorWebhookRequest,
  ): Promise<{ status: "ok" | "error"; message: string }> {
    const result = this.anorService.handleWebhook(webhook);
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
        provider: "anor",
        providerPaymentId: webhook.transactionId,
        metadata: {
          anor_order_id: webhook.orderId,
          anor_transaction_id: webhook.transactionId,
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
      const anorPayment = payments.find(
        (p) => p.provider === "anor" && p.isSucceeded(),
      );
      if (anorPayment) {
        anorPayment.refund();
        await this.paymentRepo.update(anorPayment);
      }
    }

    return result;
  }
}
