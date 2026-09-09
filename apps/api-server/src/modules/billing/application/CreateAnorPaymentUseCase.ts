import { inject, injectable } from "tsyringe";
import type { IInvoiceRepository } from "../domain";
import { AnorService } from "../infrastructure/AnorService";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";

export interface CreateAnorPaymentDTO {
  invoiceId: string;
  returnUrl?: string;
}

@injectable()
export class CreateAnorPaymentUseCase {
  constructor(
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(AnorService)
    private readonly anorService: AnorService,
  ) {}

  async execute(dto: CreateAnorPaymentDTO): Promise<{ paymentUrl: string }> {
    const invoice = await this.invoiceRepo.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundError("Invoice", dto.invoiceId);
    if (!invoice.isOpen()) throw new BusinessRuleError("Invoice is not open");

    const paymentUrl = this.anorService.generatePaymentUrl({
      amount: invoice.amountCents / 100,
      orderId: invoice.id,
      returnUrl: dto.returnUrl,
    });

    return { paymentUrl };
  }
}
