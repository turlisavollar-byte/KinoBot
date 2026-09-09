import { inject, injectable } from "tsyringe";
import { Invoice } from "../domain";
import type { IInvoiceRepository } from "../domain";
import { PaginationParams, PaginatedResult } from "@/shared/types";

@injectable()
export class ListInvoicesUseCase {
  constructor(
    @inject("IInvoiceRepository")
    private readonly repository: IInvoiceRepository,
  ) {}

  async execute(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Invoice>> {
    return this.repository.findByUserId(userId, pagination);
  }
}
