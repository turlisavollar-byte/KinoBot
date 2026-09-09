import { inject, injectable } from "tsyringe";
import type { IInvoiceRepository } from "../domain";
import { UzumService } from "../infrastructure/UzumService";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";

export interface CreateUzumPaymentDTO {
  invoiceId: string;
  returnUrl?: string;
}

@injectable()
export class CreateUzumPaymentUseCase {
  constructor(
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(UzumService)
    private readonly uzumService: UzumService,
  ) {}

  async execute(dto: CreateUzumPaymentDTO): Promise<{ paymentUrl: string }> {
    const invoice = await this.invoiceRepo.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundError("Invoice", dto.invoiceId);
    if (!invoice.isOpen()) throw new BusinessRuleError("Invoice is not open");

    const paymentUrl = this.uzumService.generatePaymentUrl({
      amount: invoice.amountCents / 100,
      orderId: invoice.id,
      returnUrl: dto.returnUrl,
    });

    return { paymentUrl };
  }
}
