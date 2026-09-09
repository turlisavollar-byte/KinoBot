import { inject, injectable } from "tsyringe";
import { BillingPlan } from "../domain";
import type { IBillingPlanRepository } from "../domain";
import { UpdatePlanDTO } from "./dto";
import { NotFoundError } from "@/shared/errors";

@injectable()
export class UpdatePlanUseCase {
  constructor(
    @inject("IBillingPlanRepository")
    private readonly repository: IBillingPlanRepository,
  ) {}

  async execute(id: string, dto: UpdatePlanDTO): Promise<BillingPlan> {
    const plan = await this.repository.findById(id);
    if (!plan) throw new NotFoundError("Plan", id);

    if (dto.name !== undefined) plan.rename(dto.name);
    if (dto.description !== undefined) plan.updateDescription(dto.description);
    if (dto.priceCents !== undefined) plan.updatePrice(dto.priceCents);
    if (dto.isActive !== undefined) {
      dto.isActive ? plan.activate() : plan.deactivate();
    }
    if (dto.metadata !== undefined) plan.updateMetadata(dto.metadata);

    return this.repository.update(plan);
  }
}
