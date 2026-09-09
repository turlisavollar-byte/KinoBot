import { inject, injectable } from "tsyringe";
import type { IInvoiceRepository } from "../domain";
import { PaynetService } from "../infrastructure/PaynetService";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";

export interface CreatePaynetPaymentDTO {
  invoiceId: string;
  returnUrl?: string;
}

@injectable()
export class CreatePaynetPaymentUseCase {
  constructor(
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(PaynetService)
    private readonly paynetService: PaynetService,
  ) {}

  async execute(dto: CreatePaynetPaymentDTO): Promise<{ paymentUrl: string }> {
    const invoice = await this.invoiceRepo.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundError("Invoice", dto.invoiceId);
    if (!invoice.isOpen()) throw new BusinessRuleError("Invoice is not open");

    const paymentUrl = this.paynetService.generatePaymentUrl({
      amount: invoice.amountCents / 100,
      orderId: invoice.id,
      returnUrl: dto.returnUrl,
    });

    return { paymentUrl };
  }
}
