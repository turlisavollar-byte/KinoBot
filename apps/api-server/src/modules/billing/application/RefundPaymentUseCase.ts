import { inject, injectable } from "tsyringe";
import type { IPaymentRepository } from "../domain";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";
import { auditPaymentRefunded } from "./billingAudit";

@injectable()
export class RefundPaymentUseCase {
  constructor(
    @inject("IPaymentRepository")
    private readonly repository: IPaymentRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const payment = await this.repository.findById(id);
    if (!payment) throw new NotFoundError("Payment", id);
    if (!payment.isSucceeded())
      throw new BusinessRuleError("Payment is not in succeeded state");
    payment.refund();
    if (this.repository.updateAndAuditRefund) {
      await this.repository.updateAndAuditRefund(payment);
      return;
    }
    const refunded = await this.repository.update(payment);
    auditPaymentRefunded(refunded);
  }
}
