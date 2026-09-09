import { inject, injectable } from "tsyringe";
import { Invoice } from "../domain";
import type { IInvoiceRepository } from "../domain";
import { NotFoundError } from "@/shared/errors";

@injectable()
export class GetInvoiceUseCase {
  constructor(
    @inject("IInvoiceRepository")
    private readonly repository: IInvoiceRepository,
  ) {}

  async execute(id: string): Promise<Invoice> {
    const invoice = await this.repository.findById(id);
    if (!invoice) throw new NotFoundError("Invoice", id);
    return invoice;
  }
}
