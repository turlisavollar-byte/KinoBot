import { inject, injectable } from "tsyringe";
import { Invoice } from "../domain";
import type { IInvoiceRepository, ISubscriptionRepository } from "../domain";
import { CreateInvoiceDTO } from "./dto";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";

@injectable()
export class CreateInvoiceUseCase {
  constructor(
    @inject("IInvoiceRepository")
    private readonly repository: IInvoiceRepository,
    @inject("ISubscriptionRepository")
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(
    dto: CreateInvoiceDTO,
    idempotencyKey?: string,
  ): Promise<Invoice> {
    if (idempotencyKey && this.repository.findByIdempotencyKey) {
      const existing =
        await this.repository.findByIdempotencyKey(idempotencyKey);
      if (existing) return existing;
    }

    if (dto.subscriptionId) {
      const subscription = await this.subscriptionRepository.findById(
        dto.subscriptionId,
      );
      if (!subscription)
        throw new NotFoundError("Subscription", dto.subscriptionId);
      if (subscription.userId !== dto.userId) {
        throw new BusinessRuleError(
          "Subscription does not belong to the invoice user",
        );
      }
      if (!subscription.isActive())
        throw new BusinessRuleError("Subscription is not active");
    }

    const invoice = Invoice.create({
      userId: dto.userId,
      subscriptionId: dto.subscriptionId,
      lineItems: dto.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmountCents: item.unitAmountCents,
      })),
      currency: dto.currency,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      metadata: dto.metadata,
      idempotencyKey,
    });
    return this.repository.save(invoice);
  }
}
