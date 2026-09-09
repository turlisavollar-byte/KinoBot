import { inject, injectable } from "tsyringe";
import { BillingPlan } from "../domain";
import type { IBillingPlanRepository } from "../domain";
import { PaginationParams, PaginatedResult } from "@/shared/types";

@injectable()
export class ListPlansUseCase {
  constructor(
    @inject("IBillingPlanRepository")
    private readonly repository: IBillingPlanRepository,
  ) {}

  async execute(
    pagination: PaginationParams,
    activeOnly: boolean,
  ): Promise<PaginatedResult<BillingPlan>> {
    return activeOnly
      ? this.repository.findActive(pagination)
      : this.repository.findAll(pagination);
  }
}
