import { inject, injectable } from "tsyringe";
import { Payment } from "../domain";
import type { IPaymentRepository } from "../domain";
import { PaginationParams, PaginatedResult } from "@/shared/types";

@injectable()
export class ListPaymentsUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly repository: IPaymentRepository,
  ) {}

  async execute(
    userId: string | undefined,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Payment>> {
    return userId
      ? this.repository.findByUserId(userId, pagination)
      : this.repository.findAll(pagination);
  }
}
