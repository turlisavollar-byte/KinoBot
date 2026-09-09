import { inject, injectable } from "tsyringe";
import { Subscription } from "../domain";
import type { ISubscriptionRepository } from "../domain";
import { PaginationParams, PaginatedResult } from "@/shared/types";

@injectable()
export class ListSubscriptionsUseCase {
  constructor(
    @inject("ISubscriptionRepository")
    private readonly repository: ISubscriptionRepository,
  ) {}

  async execute(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Subscription>> {
    return this.repository.findByUserId(userId, pagination);
  }
}
