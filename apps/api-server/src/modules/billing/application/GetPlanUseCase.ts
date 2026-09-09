import { inject, injectable } from "tsyringe";
import { BillingPlan } from "../domain";
import type { IBillingPlanRepository } from "../domain";
import { NotFoundError } from "@/shared/errors";

@injectable()
export class GetPlanUseCase {
  constructor(
    @inject("IBillingPlanRepository")
    private readonly repository: IBillingPlanRepository,
  ) {}

  async execute(id: string): Promise<BillingPlan> {
    const plan = await this.repository.findById(id);
    if (!plan) throw new NotFoundError("Plan", id);
    return plan;
  }
}
