import { BillingPlan } from './BillingPlan';
import { PaginatedResult, PaginationParams } from '@/shared/types';

export interface IBillingPlanRepository {
  findById(id: string): Promise<BillingPlan | null>;
  findActive(pagination: PaginationParams): Promise<PaginatedResult<BillingPlan>>;
  findAll(pagination: PaginationParams): Promise<PaginatedResult<BillingPlan>>;
  save(plan: BillingPlan): Promise<BillingPlan>;
  update(plan: BillingPlan): Promise<BillingPlan>;
  delete(id: string): Promise<void>;
}
