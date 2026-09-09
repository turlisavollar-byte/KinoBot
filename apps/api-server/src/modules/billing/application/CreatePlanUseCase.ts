import { inject, injectable } from "tsyringe";
import { BillingPlan } from "../domain";
import type { IBillingPlanRepository } from "../domain";
import { CreatePlanDTO } from "./dto";

@injectable()
export class CreatePlanUseCase {
  constructor(
    @inject("IBillingPlanRepository")
    private readonly repository: IBillingPlanRepository,
  ) {}

  async execute(dto: CreatePlanDTO): Promise<BillingPlan> {
    const plan = BillingPlan.create({
      name: dto.name,
      description: dto.description,
      priceCents: dto.priceCents,
      currency: dto.currency,
      interval: dto.interval,
      metadata: dto.metadata,
    });
    return this.repository.save(plan);
  }
}
