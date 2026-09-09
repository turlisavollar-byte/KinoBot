import { inject, injectable } from "tsyringe";
import { Payment } from "../domain";
import type { IInvoiceRepository, IPaymentRepository } from "../domain";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";
import { persistSuccessfulPayment } from "./persistSuccessfulPayment";

@injectable()
export class MarkInvoicePaidUseCase {
  constructor(
    @inject("IInvoiceRepository")
    private readonly repository: IInvoiceRepository,
    @inject("IPaymentRepository")
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const invoice = await this.repository.findById(id);
    if (!invoice) throw new NotFoundError("Invoice", id);
    if (!invoice.isOpen())
      throw new BusinessRuleError("Invoice is not in open state");

    const payment = Payment.create({
      userId: invoice.userId,
      invoiceId: invoice.id,
      amountCents: invoice.amountCents,
      currency: invoice.currency,
      provider: "manual",
      providerPaymentId: `manual_${invoice.id}`,
      metadata: { source: "manual_invoice_settlement" },
    });
    payment.markSucceeded(payment.providerPaymentId ?? undefined);
    await persistSuccessfulPayment(
      this.paymentRepository,
      this.repository,
      invoice,
      payment,
    );
  }
}
