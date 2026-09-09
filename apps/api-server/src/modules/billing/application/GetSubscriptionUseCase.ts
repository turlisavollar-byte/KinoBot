import { inject, injectable } from "tsyringe";
import { Subscription } from "../domain";
import type { ISubscriptionRepository } from "../domain";
import { NotFoundError } from "@/shared/errors";

@injectable()
export class GetSubscriptionUseCase {
  constructor(
    @inject("ISubscriptionRepository")
    private readonly repository: ISubscriptionRepository,
  ) {}

  async execute(id: string): Promise<Subscription> {
    const subscription = await this.repository.findById(id);
    if (!subscription) throw new NotFoundError("Subscription", id);
    return subscription;
  }
}
