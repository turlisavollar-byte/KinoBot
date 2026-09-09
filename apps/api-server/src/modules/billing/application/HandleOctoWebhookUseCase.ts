import { inject, injectable } from "tsyringe";
import type { IPaymentRepository, IInvoiceRepository } from "../domain";
import { Payment } from "../domain";
import { OctoService, OctoWebhookRequest } from "../infrastructure/OctoService";
import { NotFoundError } from "@/shared/errors";
import { persistSuccessfulPayment } from "./persistSuccessfulPayment";
import { providerAmountMatchesInvoice } from "./providerAmount";

@injectable()
export class HandleOctoWebhookUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly paymentRepo: IPaymentRepository,
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(OctoService)
    private readonly octoService: OctoService,
  ) {}

  async execute(
    webhook: OctoWebhookRequest,
  ): Promise<{ status: "ok" | "error"; message: string }> {
    const result = this.octoService.handleWebhook(webhook);
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
        provider: "octo",
        providerPaymentId: webhook.transactionId,
        metadata: {
          octo_order_id: webhook.orderId,
          octo_transaction_id: webhook.transactionId,
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
      const octoPayment = payments.find(
        (p) => p.provider === "octo" && p.isSucceeded(),
      );
      if (octoPayment) {
        octoPayment.refund();
        await this.paymentRepo.update(octoPayment);
      }
    }

    return result;
  }
}
