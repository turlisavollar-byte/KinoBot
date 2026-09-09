import { injectable } from "tsyringe";
import { eq, desc, count, inArray, and } from "drizzle-orm";
import { db, billingSubscriptionsTable } from "@workspace/db";
import { Subscription, SubscriptionProps, SubscriptionStatus, ISubscriptionRepository } from '../domain';
import { PaginatedResult, PaginationParams } from '@/shared/types';
import { AppError, ErrorCodes } from '@/shared/errors';

class DatabaseError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 500, ErrorCodes.DATABASE_ERROR, true, cause as Error);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 404, ErrorCodes.NOT_FOUND);
  }
}

@injectable()
export class DrizzleSubscriptionRepository implements ISubscriptionRepository {
  async findById(id: string): Promise<Subscription | null> {
    const [row] = await db
      .select()
      .from(billingSubscriptionsTable)
      .where(eq(billingSubscriptionsTable.id, id))
      .limit(1);

    return row ? this.mapRow(row) : null;
  }

  async findByUserId(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Subscription>> {
    const offset = (pagination.page - 1) * pagination.limit;
    
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(billingSubscriptionsTable)
      .where(eq(billingSubscriptionsTable.userId, userId));

    const rows = await db
      .select()
      .from(billingSubscriptionsTable)
      .where(eq(billingSubscriptionsTable.userId, userId))
      .orderBy(desc(billingSubscriptionsTable.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    const subs = rows.map(r => this.mapRow(r));
    const totalPages = Math.ceil(Number(total) / pagination.limit) || 1;

    return { 
      data: subs, 
      total: Number(total), 
      page: pagination.page, 
      limit: pagination.limit, 
      totalPages 
    };
  }

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    const [row] = await db
      .select()
      .from(billingSubscriptionsTable)
      .where(
        and(
          eq(billingSubscriptionsTable.userId, userId),
          inArray(billingSubscriptionsTable.status, ['active', 'trialing'])
        )
      )
      .orderBy(desc(billingSubscriptionsTable.createdAt))
      .limit(1);

    return row ? this.mapRow(row) : null;
  }

  async save(sub: Subscription): Promise<Subscription> {
    const p = sub.toProps();
    const [row] = await db
      .insert(billingSubscriptionsTable)
      .values({
        id: p.id,
        userId: p.userId,
        planId: p.planId,
        status: p.status,
        currentPeriodStart: p.currentPeriodStart,
        currentPeriodEnd: p.currentPeriodEnd,
        cancelAtPeriodEnd: p.cancelAtPeriodEnd,
        canceledAt: p.canceledAt,
        trialEnd: p.trialEnd,
        metadata: p.metadata as any,
      })
      .returning();

    if (!row) {
      throw new DatabaseError("Failed to create subscription");
    }

    return this.mapRow(row);
  }

  async update(sub: Subscription): Promise<Subscription> {
    const p = sub.toProps();
    const [row] = await db
      .update(billingSubscriptionsTable)
      .set({
        status: p.status,
        currentPeriodStart: p.currentPeriodStart,
        currentPeriodEnd: p.currentPeriodEnd,
        cancelAtPeriodEnd: p.cancelAtPeriodEnd,
        canceledAt: p.canceledAt,
        trialEnd: p.trialEnd,
        metadata: p.metadata as any,
        updatedAt: new Date(),
      })
      .where(eq(billingSubscriptionsTable.id, p.id))
      .returning();

    if (!row) {
      throw new NotFoundError('Subscription', p.id);
    }

    return this.mapRow(row);
  }

  async delete(id: string): Promise<void> {
    await db
      .delete(billingSubscriptionsTable)
      .where(eq(billingSubscriptionsTable.id, id));
  }

  private mapRow(row: any): Subscription {
    return Subscription.reconstitute({
      id: row.id,
      userId: row.userId,
      planId: row.planId,
      status: row.status as SubscriptionStatus,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      canceledAt: row.canceledAt,
      trialEnd: row.trialEnd,
      metadata: row.metadata || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
