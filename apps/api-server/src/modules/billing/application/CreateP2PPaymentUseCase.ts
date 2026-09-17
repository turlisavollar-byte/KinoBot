import { inject, injectable } from "tsyringe";
import type { IInvoiceRepository } from "../domain";
import { P2PService } from "../infrastructure/P2PService";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";

export interface CreateP2PPaymentDTO {
  invoiceId: string;
  returnUrl?: string;
}

@injectable()
export class CreateP2PPaymentUseCase {
  constructor(
    @inject("IInvoiceRepository")
    private readonly invoiceRepo: IInvoiceRepository,
    @inject(P2PService)
    private readonly p2pService: P2PService,
  ) {}

  async execute(dto: CreateP2PPaymentDTO): Promise<{ paymentUrl: string }> {
    const invoice = await this.invoiceRepo.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundError("Invoice", dto.invoiceId);
    if (!invoice.isOpen()) throw new BusinessRuleError("Invoice is not open");

    const paymentUrl = this.p2pService.generatePaymentUrl({
      amount: invoice.amountCents / 100,
      orderId: invoice.id,
      returnUrl: dto.returnUrl,
    });

    return { paymentUrl };
  }
}
