import { injectable } from "tsyringe";
import { eq, desc, count } from "drizzle-orm";
import { db, billingPlansTable } from "@workspace/db";
import { BillingPlan, BillingPlanProps, BillingInterval, IBillingPlanRepository } from '../domain';
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
export class DrizzleBillingPlanRepository implements IBillingPlanRepository {
  async findById(id: string): Promise<BillingPlan | null> {
    const [row] = await db
      .select()
      .from(billingPlansTable)
      .where(eq(billingPlansTable.id, id))
      .limit(1);

    return row ? this.mapRow(row) : null;
  }

  async findActive(pagination: PaginationParams): Promise<PaginatedResult<BillingPlan>> {
    const offset = (pagination.page - 1) * pagination.limit;
    
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(billingPlansTable)
      .where(eq(billingPlansTable.isActive, true));

    const rows = await db
      .select()
      .from(billingPlansTable)
      .where(eq(billingPlansTable.isActive, true))
      .orderBy(desc(billingPlansTable.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    const plans = rows.map(r => this.mapRow(r));
    const totalPages = Math.ceil(Number(total) / pagination.limit) || 1;

    return { 
      data: plans, 
      total: Number(total), 
      page: pagination.page, 
      limit: pagination.limit, 
      totalPages 
    };
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<BillingPlan>> {
    const offset = (pagination.page - 1) * pagination.limit;
    
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(billingPlansTable);

    const rows = await db
      .select()
      .from(billingPlansTable)
      .orderBy(desc(billingPlansTable.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    const plans = rows.map(r => this.mapRow(r));
    const totalPages = Math.ceil(Number(total) / pagination.limit) || 1;

    return { 
      data: plans, 
      total: Number(total), 
      page: pagination.page, 
      limit: pagination.limit, 
      totalPages 
    };
  }

  async save(plan: BillingPlan): Promise<BillingPlan> {
    const p = plan.toProps();
    const [row] = await db
      .insert(billingPlansTable)
      .values({
        id: p.id,
        name: p.name,
        description: p.description,
        priceCents: p.priceCents,
        currency: p.currency,
        interval: p.interval,
        isActive: p.isActive,
        metadata: p.metadata as any,
      })
      .returning();

    if (!row) {
      throw new DatabaseError("Failed to create billing plan");
    }

    return this.mapRow(row);
  }

  async update(plan: BillingPlan): Promise<BillingPlan> {
    const p = plan.toProps();
    const [row] = await db
      .update(billingPlansTable)
      .set({
        name: p.name,
        description: p.description,
        priceCents: p.priceCents,
        currency: p.currency,
        isActive: p.isActive,
        metadata: p.metadata as any,
        updatedAt: new Date(),
      })
      .where(eq(billingPlansTable.id, p.id))
      .returning();

    if (!row) {
      throw new NotFoundError('BillingPlan', p.id);
    }

    return this.mapRow(row);
  }

  async delete(id: string): Promise<void> {
    await db
      .delete(billingPlansTable)
      .where(eq(billingPlansTable.id, id));
  }

  private mapRow(row: any): BillingPlan {
    return BillingPlan.reconstitute({
      id: row.id,
      name: row.name,
      description: row.description,
      priceCents: row.priceCents,
      currency: row.currency,
      interval: row.interval as BillingInterval,
      isActive: row.isActive,
      metadata: row.metadata || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
