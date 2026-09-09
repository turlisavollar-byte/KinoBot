import { inject, injectable } from "tsyringe";
import type { IBillingPlanRepository } from "../domain";

@injectable()
export class DeletePlanUseCase {
  constructor(
    @inject("IBillingPlanRepository")
    private readonly repository: IBillingPlanRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
