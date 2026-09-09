type SupabaseClient = any;
import { BillingPlan, BillingPlanProps, BillingInterval, IBillingPlanRepository } from '../domain';
import { PaginatedResult, PaginationParams } from '@/shared/types';
import { DatabaseError, NotFoundError } from '@/shared/errors';

interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export class SupabaseBillingPlanRepository implements IBillingPlanRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<BillingPlan | null> {
    const { data, error } = await this.client
      .from('billing_plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message, error);
    if (!data) return null;
    return this.mapRow(data as PlanRow);
  }

  async findActive(pagination: PaginationParams): Promise<PaginatedResult<BillingPlan>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const { data, error, count } = await this.client
      .from('billing_plans')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + pagination.limit - 1);
    if (error) throw new DatabaseError(error.message, error);
    const plans = (data as PlanRow[]).map(r => this.mapRow(r));
    return { data: plans, total: count || 0, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil((count || 0) / pagination.limit) || 1 };
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<BillingPlan>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const { data, error, count } = await this.client
      .from('billing_plans')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pagination.limit - 1);
    if (error) throw new DatabaseError(error.message, error);
    const plans = (data as PlanRow[]).map(r => this.mapRow(r));
    return { data: plans, total: count || 0, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil((count || 0) / pagination.limit) || 1 };
  }

  async save(plan: BillingPlan): Promise<BillingPlan> {
    const p = plan.toProps();
    const { data, error } = await this.client
      .from('billing_plans')
      .insert({
        id: p.id, name: p.name, description: p.description, price_cents: p.priceCents,
        currency: p.currency, interval: p.interval, is_active: p.isActive, metadata: p.metadata,
      })
      .select('*').single();
    if (error) throw new DatabaseError(error.message, error);
    return this.mapRow(data as PlanRow);
  }

  async update(plan: BillingPlan): Promise<BillingPlan> {
    const p = plan.toProps();
    const { data, error } = await this.client
      .from('billing_plans')
      .update({
        name: p.name, description: p.description, price_cents: p.priceCents,
        currency: p.currency, is_active: p.isActive, metadata: p.metadata,
      })
      .eq('id', p.id)
      .select('*').single();
    if (error) throw new DatabaseError(error.message, error);
    if (!data) throw new NotFoundError('Plan', p.id);
    return this.mapRow(data as PlanRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('billing_plans').delete().eq('id', id);
    if (error) throw new DatabaseError(error.message, error);
  }

  private mapRow(row: PlanRow): BillingPlan {
    return BillingPlan.reconstitute({
      id: row.id, name: row.name, description: row.description, priceCents: row.price_cents,
      currency: row.currency, interval: row.interval as BillingInterval, isActive: row.is_active,
      metadata: row.metadata || {}, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    });
  }
}
