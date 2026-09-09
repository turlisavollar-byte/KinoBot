import { inject, injectable } from "tsyringe";
import type { IInvoiceRepository } from "../domain";
import { PaymeService } from "../infrastructure/PaymeService";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";

export interface CreatePaymePaymentDTO {
  invoiceId: string;
  returnUrl?: string;
}

@injectable()
export class CreatePaymePaymentUseCase {
  constructor(
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(PaymeService)
    private readonly paymeService: PaymeService,
  ) {}

  async execute(dto: CreatePaymePaymentDTO): Promise<{ paymentUrl: string }> {
    const invoice = await this.invoiceRepo.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundError("Invoice", dto.invoiceId);
    if (!invoice.isOpen()) throw new BusinessRuleError("Invoice is not open");

    const paymentUrl = this.paymeService.generatePaymentUrl({
      amount: invoice.amountCents,
      merchantTransId: invoice.id,
      returnUrl: dto.returnUrl,
    });

    return { paymentUrl };
  }
}
