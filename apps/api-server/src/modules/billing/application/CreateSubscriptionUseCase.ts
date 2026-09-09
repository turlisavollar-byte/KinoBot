import { inject, injectable } from "tsyringe";
import { Subscription } from "../domain";
import type {
  ISubscriptionRepository,
  IBillingPlanRepository,
} from "../domain";
import { CreateSubscriptionDTO } from "./dto";
import { NotFoundError, BusinessRuleError } from "@/shared/errors";

@injectable()
export class CreateSubscriptionUseCase {
  constructor(
    @inject("ISubscriptionRepository")
    private readonly subscriptionRepo: ISubscriptionRepository,
    @inject("IBillingPlanRepository")
    private readonly planRepo: IBillingPlanRepository,
  ) {}

  async execute(dto: CreateSubscriptionDTO): Promise<Subscription> {
    const plan = await this.planRepo.findById(dto.planId);
    if (!plan) throw new NotFoundError("Plan", dto.planId);
    if (!plan.isActive) throw new BusinessRuleError("Plan is not active");

    const existing = await this.subscriptionRepo.findActiveByUserId(dto.userId);
    if (existing)
      throw new BusinessRuleError("User already has an active subscription");

    const now = new Date();
    let periodEnd: Date;
    if (plan.interval === "monthly") {
      periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (plan.interval === "yearly") {
      periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 100);
    }

    let trialEnd: Date | undefined;
    if (dto.trialDays && dto.trialDays > 0) {
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + dto.trialDays);
    }

    const subscription = Subscription.create({
      userId: dto.userId,
      planId: dto.planId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEnd,
      metadata: dto.metadata,
    });

    return this.subscriptionRepo.save(subscription);
  }
}
