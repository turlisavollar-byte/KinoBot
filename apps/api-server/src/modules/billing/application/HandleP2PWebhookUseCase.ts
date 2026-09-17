import { inject, injectable } from "tsyringe";
import type { IPaymentRepository, IInvoiceRepository } from "../domain";
import { Payment } from "../domain";
import { P2PService, P2PWebhookRequest } from "../infrastructure/P2PService";
import { persistSuccessfulPayment } from "./persistSuccessfulPayment";
import { providerAmountMatchesInvoice } from "./providerAmount";

@injectable()
export class HandleP2PWebhookUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly paymentRepo: IPaymentRepository,
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(P2PService)
    private readonly p2pService: P2PService,
  ) {}

  async execute(
    webhook: P2PWebhookRequest,
  ): Promise<{ status: "ok" | "error"; message: string }> {
    const result = this.p2pService.handleWebhook(webhook);
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
        provider: "p2p",
        providerPaymentId: webhook.transactionId,
        metadata: {
          p2p_order_id: webhook.orderId,
          p2p_transaction_id: webhook.transactionId,
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
      const p2pPayment = payments.find(
        (p) => p.provider === "p2p" && p.isSucceeded(),
      );
      if (p2pPayment) {
        p2pPayment.refund();
        await this.paymentRepo.update(p2pPayment);
      }
    }

    return result;
  }
}
