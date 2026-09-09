import { inject, injectable } from "tsyringe";
import type { IPaymentRepository, IInvoiceRepository } from "../domain";
import { Payment } from "../domain";
import { NBUService, NBUWebhookRequest } from "../infrastructure/NBUService";
import { NotFoundError } from "@/shared/errors";
import { persistSuccessfulPayment } from "./persistSuccessfulPayment";
import { providerAmountMatchesInvoice } from "./providerAmount";

@injectable()
export class HandleNBUWebhookUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly paymentRepo: IPaymentRepository,
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(NBUService)
    private readonly nbuService: NBUService,
  ) {}

  async execute(
    webhook: NBUWebhookRequest,
  ): Promise<{ status: "ok" | "error"; message: string }> {
    const result = this.nbuService.handleWebhook(webhook);
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
        provider: "nbu",
        providerPaymentId: webhook.transactionId,
        metadata: {
          nbu_order_id: webhook.orderId,
          nbu_transaction_id: webhook.transactionId,
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
      const nbuPayment = payments.find(
        (p) => p.provider === "nbu" && p.isSucceeded(),
      );
      if (nbuPayment) {
        nbuPayment.refund();
        await this.paymentRepo.update(nbuPayment);
      }
    }

    return result;
  }
}
