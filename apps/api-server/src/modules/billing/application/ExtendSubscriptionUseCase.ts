import { inject, injectable } from "tsyringe";
import type { ISubscriptionRepository } from "../domain";
import { ExtendSubscriptionDTO } from "./dto";
import { NotFoundError } from "@/shared/errors";

@injectable()
export class ExtendSubscriptionUseCase {
  constructor(
    @inject("ISubscriptionRepository")
    private readonly repository: ISubscriptionRepository,
  ) {}

  async execute(dto: ExtendSubscriptionDTO): Promise<any> {
    const subscription = await this.repository.findById(dto.id);
    if (!subscription) throw new NotFoundError("Subscription", dto.id);
    
    // Extend subscription by adding days to the end date
    const baseDate = subscription.currentPeriodEnd > new Date() 
      ? subscription.currentPeriodEnd 
      : new Date();
    const newEndDate = new Date(baseDate);
    newEndDate.setDate(newEndDate.getDate() + dto.days);
    
    // Use the renew method to properly extend the subscription
    subscription.renew(subscription.currentPeriodStart, newEndDate);
    subscription.activate();
    
    return await this.repository.update(subscription);
  }
}