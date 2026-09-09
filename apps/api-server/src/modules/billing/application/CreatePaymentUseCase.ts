import { inject, injectable } from "tsyringe";
import { Payment } from "../domain";
import type { IPaymentRepository, IInvoiceRepository } from "../domain";
import { CreatePaymentDTO } from "./dto";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";

@injectable()
export class CreatePaymentUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly paymentRepo: IPaymentRepository,
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
  ) {}

  async execute(dto: CreatePaymentDTO): Promise<Payment> {
    const invoice = await this.invoiceRepo.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundError("Invoice", dto.invoiceId);
    if (!invoice.isOpen()) throw new BusinessRuleError("Invoice is not open");

    const existingPayments =
      (await this.paymentRepo.findByInvoiceId(dto.invoiceId)) ?? [];
    const duplicate = dto.providerPaymentId
      ? existingPayments.find(
          (payment) => payment.providerPaymentId === dto.providerPaymentId,
        )
      : undefined;
    if (duplicate) return duplicate;

    const settledAmountCents = existingPayments
      .filter((payment) => payment.isSucceeded())
      .reduce((total, payment) => total + payment.amountCents, 0);
    const remainingAmountCents = invoice.amountCents - settledAmountCents;
    if (dto.amountCents > remainingAmountCents) {
      throw new BusinessRuleError("Payment amount exceeds invoice amount");
    }

    const payment = Payment.create({
      userId: invoice.userId,
      invoiceId: dto.invoiceId,
      amountCents: dto.amountCents,
      currency: dto.currency,
      provider: dto.provider,
      providerPaymentId: dto.providerPaymentId,
      metadata: dto.metadata,
    });

    payment.markSucceeded(dto.providerPaymentId);
    const shouldSettle =
      settledAmountCents + dto.amountCents >= invoice.amountCents;
    if (shouldSettle) {
      invoice.markPaid();
    }

    if (this.paymentRepo.saveAndSettle) {
      return this.paymentRepo.saveAndSettle(payment, invoice);
    }

    const saved = await this.paymentRepo.save(payment);
    if (shouldSettle) await this.invoiceRepo.update(invoice);
    return saved;
  }
}
