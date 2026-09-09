import { inject, injectable } from "tsyringe";
import type { IInvoiceRepository } from "../domain";
import { NBUService } from "../infrastructure/NBUService";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";

export interface CreateNBUPaymentDTO {
  invoiceId: string;
  returnUrl?: string;
}

@injectable()
export class CreateNBUPaymentUseCase {
  constructor(
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(NBUService)
    private readonly nbuService: NBUService,
  ) {}

  async execute(dto: CreateNBUPaymentDTO): Promise<{ paymentUrl: string }> {
    const invoice = await this.invoiceRepo.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundError("Invoice", dto.invoiceId);
    if (!invoice.isOpen()) throw new BusinessRuleError("Invoice is not open");

    const paymentUrl = this.nbuService.generatePaymentUrl({
      amount: invoice.amountCents / 100,
      orderId: invoice.id,
      returnUrl: dto.returnUrl,
    });

    return { paymentUrl };
  }
}
