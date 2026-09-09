import { inject, injectable } from "tsyringe";
import type { IPaymentRepository, IInvoiceRepository } from "../domain";
import { Payment } from "../domain";
import { UzumService, UzumWebhookRequest } from "../infrastructure/UzumService";
import { NotFoundError } from "@/shared/errors";
import { persistSuccessfulPayment } from "./persistSuccessfulPayment";
import { providerAmountMatchesInvoice } from "./providerAmount";

@injectable()
export class HandleUzumWebhookUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly paymentRepo: IPaymentRepository,
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(UzumService)
    private readonly uzumService: UzumService,
  ) {}

  async execute(
    webhook: UzumWebhookRequest,
  ): Promise<{ status: "ok" | "error"; message: string }> {
    const result = this.uzumService.handleWebhook(webhook);
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
        provider: "uzum",
        providerPaymentId: webhook.transactionId,
        metadata: {
          uzum_order_id: webhook.orderId,
          uzum_transaction_id: webhook.transactionId,
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
      const uzumPayment = payments.find(
        (p) => p.provider === "uzum" && p.isSucceeded(),
      );
      if (uzumPayment) {
        uzumPayment.refund();
        await this.paymentRepo.update(uzumPayment);
      }
    }

    return result;
  }
}
