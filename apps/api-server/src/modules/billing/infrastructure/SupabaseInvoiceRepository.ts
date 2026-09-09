type SupabaseClient = any;
import {
  Invoice,
  InvoiceProps,
  InvoiceStatus,
  LineItem,
  IInvoiceRepository,
} from "../domain";
import { PaginatedResult, PaginationParams } from "@/shared/types";
import { DatabaseError, NotFoundError } from "@/shared/errors";

interface InvoiceRow {
  id: string;
  idempotency_key: string | null;
  user_id: string;
  subscription_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  line_items: LineItem[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export class SupabaseInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Invoice | null> {
    const { data, error } = await this.client
      .from("billing_invoices")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message, error);
    if (!data) return null;
    return this.mapRow(data as InvoiceRow);
  }

  async findByIdempotencyKey(key: string): Promise<Invoice | null> {
    const { data, error } = await this.client
      .from("billing_invoices")
      .select("*")
      .eq("idempotency_key", key)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message, error);
    if (!data) return null;
    return this.mapRow(data as InvoiceRow);
  }

  async findByUserId(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Invoice>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const { data, error, count } = await this.client
      .from("billing_invoices")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + pagination.limit - 1);
    if (error) throw new DatabaseError(error.message, error);
    const invoices = (data as InvoiceRow[]).map((r) => this.mapRow(r));
    return {
      data: invoices,
      total: count || 0,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil((count || 0) / pagination.limit) || 1,
    };
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Invoice[]> {
    const { data, error } = await this.client
      .from("billing_invoices")
      .select("*")
      .eq("subscription_id", subscriptionId)
      .order("created_at", { ascending: false });
    if (error) throw new DatabaseError(error.message, error);
    return (data as InvoiceRow[]).map((r) => this.mapRow(r));
  }

  async save(invoice: Invoice): Promise<Invoice> {
    const p = invoice.toProps();
    const { data, error } = await this.client
      .from("billing_invoices")
      .insert({
        id: p.id,
        idempotency_key: p.idempotencyKey,
        user_id: p.userId,
        subscription_id: p.subscriptionId,
        amount_cents: p.amountCents,
        currency: p.currency,
        status: p.status,
        due_date: p.dueDate,
        paid_at: p.paidAt,
        line_items: p.lineItems,
        metadata: p.metadata,
      })
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message, error);
    return this.mapRow(data as InvoiceRow);
  }

  async update(invoice: Invoice): Promise<Invoice> {
    const p = invoice.toProps();
    const { data, error } = await this.client
      .from("billing_invoices")
      .update({
        amount_cents: p.amountCents,
        status: p.status,
        due_date: p.dueDate,
        paid_at: p.paidAt,
        line_items: p.lineItems,
        metadata: p.metadata,
      })
      .eq("id", p.id)
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message, error);
    if (!data) throw new NotFoundError("Invoice", p.id);
    return this.mapRow(data as InvoiceRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from("billing_invoices")
      .delete()
      .eq("id", id);
    if (error) throw new DatabaseError(error.message, error);
  }

  private mapRow(row: InvoiceRow): Invoice {
    return Invoice.reconstitute({
      id: row.id,
      idempotencyKey: row.idempotency_key,
      userId: row.user_id,
      subscriptionId: row.subscription_id,
      amountCents: row.amount_cents,
      currency: row.currency,
      status: row.status as InvoiceStatus,
      dueDate: row.due_date ? new Date(row.due_date) : null,
      paidAt: row.paid_at ? new Date(row.paid_at) : null,
      lineItems: row.line_items || [],
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
