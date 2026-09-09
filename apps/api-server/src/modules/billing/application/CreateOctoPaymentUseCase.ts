import { inject, injectable } from "tsyringe";
import type { IInvoiceRepository } from "../domain";
import { OctoService } from "../infrastructure/OctoService";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";

export interface CreateOctoPaymentDTO {
  invoiceId: string;
  returnUrl?: string;
}

@injectable()
export class CreateOctoPaymentUseCase {
  constructor(
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(OctoService)
    private readonly octoService: OctoService,
  ) {}

  async execute(dto: CreateOctoPaymentDTO): Promise<{ paymentUrl: string }> {
    const invoice = await this.invoiceRepo.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundError("Invoice", dto.invoiceId);
    if (!invoice.isOpen()) throw new BusinessRuleError("Invoice is not open");

    const paymentUrl = this.octoService.generatePaymentUrl({
      amount: invoice.amountCents / 100,
      orderId: invoice.id,
      returnUrl: dto.returnUrl,
    });

    return { paymentUrl };
  }
}
