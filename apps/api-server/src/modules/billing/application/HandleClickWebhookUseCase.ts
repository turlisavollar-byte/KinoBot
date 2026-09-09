import { inject, injectable } from "tsyringe";
import type { IPaymentRepository, IInvoiceRepository } from "../domain";
import { Payment } from "../domain";
import {
  ClickService,
  ClickWebhookRequest,
  ClickWebhookResponse,
} from "../infrastructure/ClickService";
import { persistSuccessfulPayment } from "./persistSuccessfulPayment";
import { providerAmountMatchesInvoice } from "./providerAmount";

@injectable()
export class HandleClickWebhookUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly paymentRepo: IPaymentRepository,
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(ClickService)
    private readonly clickService: ClickService,
  ) {}

  async execute(webhook: ClickWebhookRequest): Promise<ClickWebhookResponse> {
    if (webhook.action === 0) {
      const result = this.clickService.handlePrepare(webhook);
      if (result.error !== 0) return result;

      const invoice = await this.invoiceRepo.findById(
        webhook.merchant_trans_id,
      );
      if (!invoice) return { error: -5, error_note: "Invoice not found" };
      if (!invoice.isOpen())
        return { error: -9, error_note: "Invoice is not open" };
      if (Math.abs(webhook.amount - invoice.amountCents / 100) > 0.01) {
        return { error: -4, error_note: "Amount mismatch" };
      }

      return result;
    }

    if (webhook.action === 1) {
      const result = this.clickService.handleComplete(webhook);
      if (result.error !== 0) return result;

      const invoice = await this.invoiceRepo.findById(
        webhook.merchant_trans_id,
      );
      if (!invoice) return { error: -5, error_note: "Invoice not found" };
      if (!providerAmountMatchesInvoice(invoice.amountCents, webhook.amount)) {
        return { error: -4, error_note: "Amount mismatch" };
      }

      const payment = Payment.create({
        userId: invoice.userId,
        invoiceId: invoice.id,
        amountCents: invoice.amountCents,
        currency: "uzs",
        provider: "click",
        providerPaymentId: `click_${webhook.click_paydoc_id}`,
        metadata: {
          click_trans_id: webhook.click_trans_id,
          click_paydoc_id: webhook.click_paydoc_id,
          sign_time: webhook.sign_time,
        },
      });
      payment.markSucceeded(`click_${webhook.click_paydoc_id}`);
      const persisted = await persistSuccessfulPayment(
        this.paymentRepo,
        this.invoiceRepo,
        invoice,
        payment,
      );
      if (!persisted) return { error: -9, error_note: "Invoice is not open" };

      return result;
    }

    return { error: -8, error_note: "Unknown action" };
  }
}
