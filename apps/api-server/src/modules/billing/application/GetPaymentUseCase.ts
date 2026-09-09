import { inject, injectable } from "tsyringe";
import { Payment } from "../domain";
import type { IPaymentRepository } from "../domain";
import { NotFoundError } from "@/shared/errors";

@injectable()
export class GetPaymentUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly repository: IPaymentRepository,
  ) {}

  async execute(id: string): Promise<Payment> {
    const payment = await this.repository.findById(id);
    if (!payment) throw new NotFoundError("Payment", id);
    return payment;
  }
}
