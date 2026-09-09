import { injectable } from "tsyringe";
import { eq, desc, count } from "drizzle-orm";
import { db, billingInvoicesTable } from "@workspace/db";
import {
  Invoice,
  InvoiceProps,
  InvoiceStatus,
  IInvoiceRepository,
} from "../domain";
import { PaginatedResult, PaginationParams } from "@/shared/types";
import { AppError, ErrorCodes } from "@/shared/errors";

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
export class DrizzleInvoiceRepository implements IInvoiceRepository {
  async findById(id: string): Promise<Invoice | null> {
    const [row] = await db
      .select()
      .from(billingInvoicesTable)
      .where(eq(billingInvoicesTable.id, id))
      .limit(1);

    return row ? this.mapRow(row) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Invoice | null> {
    const [row] = await db
      .select()
      .from(billingInvoicesTable)
      .where(eq(billingInvoicesTable.idempotencyKey, key))
      .limit(1);

    return row ? this.mapRow(row) : null;
  }

  async findByUserId(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Invoice>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(billingInvoicesTable)
      .where(eq(billingInvoicesTable.userId, userId));

    const rows = await db
      .select()
      .from(billingInvoicesTable)
      .where(eq(billingInvoicesTable.userId, userId))
      .orderBy(desc(billingInvoicesTable.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    const invoices = rows.map((r) => this.mapRow(r));
    const totalPages = Math.ceil(Number(total) / pagination.limit) || 1;

    return {
      data: invoices,
      total: Number(total),
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
    };
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Invoice[]> {
    const rows = await db
      .select()
      .from(billingInvoicesTable)
      .where(eq(billingInvoicesTable.subscriptionId, subscriptionId))
      .orderBy(desc(billingInvoicesTable.createdAt));

    return rows.map((r) => this.mapRow(r));
  }

  async save(invoice: Invoice): Promise<Invoice> {
    const p = invoice.toProps();
    const [row] = await db
      .insert(billingInvoicesTable)
      .values({
        id: p.id,
        idempotencyKey: p.idempotencyKey,
        userId: p.userId,
        subscriptionId: p.subscriptionId,
        amountCents: p.amountCents,
        currency: p.currency,
        status: p.status,
        dueDate: p.dueDate,
        paidAt: p.paidAt,
        lineItems: p.lineItems as any,
        metadata: p.metadata as any,
      })
      .returning();

    if (!row) {
      throw new DatabaseError("Failed to create invoice");
    }

    return this.mapRow(row);
  }

  async update(invoice: Invoice): Promise<Invoice> {
    const p = invoice.toProps();
    const [row] = await db
      .update(billingInvoicesTable)
      .set({
        status: p.status,
        dueDate: p.dueDate,
        paidAt: p.paidAt,
        lineItems: p.lineItems as any,
        metadata: p.metadata as any,
        updatedAt: new Date(),
      })
      .where(eq(billingInvoicesTable.id, p.id))
      .returning();

    if (!row) {
      throw new NotFoundError("Invoice", p.id);
    }

    return this.mapRow(row);
  }

  async delete(id: string): Promise<void> {
    await db
      .delete(billingInvoicesTable)
      .where(eq(billingInvoicesTable.id, id));
  }

  private mapRow(row: any): Invoice {
    return Invoice.reconstitute({
      id: row.id,
      idempotencyKey: row.idempotencyKey,
      userId: row.userId,
      subscriptionId: row.subscriptionId,
      amountCents: row.amountCents,
      currency: row.currency,
      status: row.status as InvoiceStatus,
      dueDate: row.dueDate,
      paidAt: row.paidAt,
      lineItems: row.lineItems || [],
      metadata: row.metadata || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
