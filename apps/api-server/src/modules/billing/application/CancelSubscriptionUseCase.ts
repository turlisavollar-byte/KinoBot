import { inject, injectable } from "tsyringe";
import type { ISubscriptionRepository } from "../domain";
import { CancelSubscriptionDTO } from "./dto";
import { NotFoundError } from "@/shared/errors";

@injectable()
export class CancelSubscriptionUseCase {
  constructor(
    @inject("ISubscriptionRepository")
    private readonly repository: ISubscriptionRepository,
  ) {}

  async execute(dto: CancelSubscriptionDTO): Promise<void> {
    const subscription = await this.repository.findById(dto.id);
    if (!subscription) throw new NotFoundError("Subscription", dto.id);
    subscription.cancel(dto.immediate);
    await this.repository.update(subscription);
  }
}
