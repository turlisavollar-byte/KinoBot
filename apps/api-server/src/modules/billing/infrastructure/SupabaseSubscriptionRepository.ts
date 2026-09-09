type SupabaseClient = any;
import { Subscription, SubscriptionProps, SubscriptionStatus, ISubscriptionRepository } from '../domain';
import { PaginatedResult, PaginationParams } from '@/shared/types';
import { DatabaseError, NotFoundError } from '@/shared/errors';

interface SubRow {
  id: string; user_id: string; plan_id: string; status: string;
  current_period_start: string; current_period_end: string;
  cancel_at_period_end: boolean; canceled_at: string | null; trial_end: string | null;
  metadata: Record<string, unknown>; created_at: string; updated_at: string;
}

export class SupabaseSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Subscription | null> {
    const { data, error } = await this.client.from('billing_subscriptions').select('*').eq('id', id).maybeSingle();
    if (error) throw new DatabaseError(error.message, error);
    if (!data) return null;
    return this.mapRow(data as SubRow);
  }

  async findByUserId(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Subscription>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const { data, error, count } = await this.client
      .from('billing_subscriptions').select('*', { count: 'exact' }).eq('user_id', userId)
      .order('created_at', { ascending: false }).range(offset, offset + pagination.limit - 1);
    if (error) throw new DatabaseError(error.message, error);
    const subs = (data as SubRow[]).map(r => this.mapRow(r));
    return { data: subs, total: count || 0, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil((count || 0) / pagination.limit) || 1 };
  }

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    const { data, error } = await this.client
      .from('billing_subscriptions').select('*').eq('user_id', userId)
      .in('status', ['active', 'trialing']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new DatabaseError(error.message, error);
    if (!data) return null;
    return this.mapRow(data as SubRow);
  }

  async save(sub: Subscription): Promise<Subscription> {
    const p = sub.toProps();
    const { data, error } = await this.client.from('billing_subscriptions').insert({
      id: p.id, user_id: p.userId, plan_id: p.planId, status: p.status,
      current_period_start: p.currentPeriodStart, current_period_end: p.currentPeriodEnd,
      cancel_at_period_end: p.cancelAtPeriodEnd, canceled_at: p.canceledAt, trial_end: p.trialEnd,
      metadata: p.metadata,
    }).select('*').single();
    if (error) throw new DatabaseError(error.message, error);
    return this.mapRow(data as SubRow);
  }

  async update(sub: Subscription): Promise<Subscription> {
    const p = sub.toProps();
    const { data, error } = await this.client.from('billing_subscriptions').update({
      status: p.status, current_period_start: p.currentPeriodStart, current_period_end: p.currentPeriodEnd,
      cancel_at_period_end: p.cancelAtPeriodEnd, canceled_at: p.canceledAt, trial_end: p.trialEnd,
      metadata: p.metadata,
    }).eq('id', p.id).select('*').single();
    if (error) throw new DatabaseError(error.message, error);
    if (!data) throw new NotFoundError('Subscription', p.id);
    return this.mapRow(data as SubRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('billing_subscriptions').delete().eq('id', id);
    if (error) throw new DatabaseError(error.message, error);
  }

  private mapRow(row: SubRow): Subscription {
    return Subscription.reconstitute({
      id: row.id, userId: row.user_id, planId: row.plan_id, status: row.status as SubscriptionStatus,
      currentPeriodStart: new Date(row.current_period_start), currentPeriodEnd: new Date(row.current_period_end),
      cancelAtPeriodEnd: row.cancel_at_period_end, canceledAt: row.canceled_at ? new Date(row.canceled_at) : null,
      trialEnd: row.trial_end ? new Date(row.trial_end) : null, metadata: row.metadata || {},
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    });
  }
}
