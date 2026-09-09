import { inject, injectable } from "tsyringe";
import type { IPaymentRepository, IInvoiceRepository } from "../domain";
import { ClickService } from "../infrastructure/ClickService";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";

export interface CreateClickPaymentDTO {
  invoiceId: string;
  returnUrl?: string;
}

@injectable()
export class CreateClickPaymentUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly paymentRepo: IPaymentRepository,
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(ClickService)
    private readonly clickService: ClickService,
  ) {}

  async execute(dto: CreateClickPaymentDTO): Promise<{ paymentUrl: string }> {
    const invoice = await this.invoiceRepo.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundError("Invoice", dto.invoiceId);
    if (!invoice.isOpen()) throw new BusinessRuleError("Invoice is not open");

    const paymentUrl = this.clickService.generatePaymentUrl({
      amount: invoice.amountCents / 100,
      merchantTransId: invoice.id,
      returnUrl: dto.returnUrl,
    });

    return { paymentUrl };
  }
}
