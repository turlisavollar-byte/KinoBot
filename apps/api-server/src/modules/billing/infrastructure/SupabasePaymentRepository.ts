type SupabaseClient = any;
import {
  Payment,
  PaymentProps,
  PaymentStatus,
  PaymentProvider,
  IPaymentRepository,
} from "../domain";
import { PaginatedResult, PaginationParams } from "@/shared/types";
import { DatabaseError, NotFoundError } from "@/shared/errors";

interface PaymentRow {
  id: string;
  user_id: string;
  invoice_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  provider: string;
  provider_payment_id: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export class SupabasePaymentRepository implements IPaymentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Payment | null> {
    const { data, error } = await this.client
      .from("billing_payments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message, error);
    if (!data) return null;
    return this.mapRow(data as PaymentRow);
  }

  async findByUserId(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Payment>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const { data, error, count } = await this.client
      .from("billing_payments")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + pagination.limit - 1);
    if (error) throw new DatabaseError(error.message, error);
    const payments = (data as PaymentRow[]).map((r) => this.mapRow(r));
    return {
      data: payments,
      total: count || 0,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil((count || 0) / pagination.limit) || 1,
    };
  }

  async findAll(
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Payment>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const { data, error, count } = await this.client
      .from("billing_payments")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + pagination.limit - 1);
    if (error) throw new DatabaseError(error.message, error);
    const payments = (data as PaymentRow[]).map((r) => this.mapRow(r));
    return {
      data: payments,
      total: count || 0,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil((count || 0) / pagination.limit) || 1,
    };
  }

  async findByInvoiceId(invoiceId: string): Promise<Payment[]> {
    const { data, error } = await this.client
      .from("billing_payments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false });
    if (error) throw new DatabaseError(error.message, error);
    return (data as PaymentRow[]).map((r) => this.mapRow(r));
  }

  async save(payment: Payment): Promise<Payment> {
    const p = payment.toProps();
    const { data, error } = await this.client
      .from("billing_payments")
      .insert({
        id: p.id,
        user_id: p.userId,
        invoice_id: p.invoiceId,
        amount_cents: p.amountCents,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        provider_payment_id: p.providerPaymentId,
        failure_reason: p.failureReason,
        metadata: p.metadata,
      })
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message, error);
    return this.mapRow(data as PaymentRow);
  }

  async update(payment: Payment): Promise<Payment> {
    const p = payment.toProps();
    const { data, error } = await this.client
      .from("billing_payments")
      .update({
        status: p.status,
        provider_payment_id: p.providerPaymentId,
        failure_reason: p.failureReason,
        metadata: p.metadata,
      })
      .eq("id", p.id)
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message, error);
    if (!data) throw new NotFoundError("Payment", p.id);
    return this.mapRow(data as PaymentRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from("billing_payments")
      .delete()
      .eq("id", id);
    if (error) throw new DatabaseError(error.message, error);
  }

  private mapRow(row: PaymentRow): Payment {
    return Payment.reconstitute({
      id: row.id,
      userId: row.user_id,
      invoiceId: row.invoice_id,
      amountCents: row.amount_cents,
      currency: row.currency,
      status: row.status as PaymentStatus,
      provider: row.provider as PaymentProvider,
      providerPaymentId: row.provider_payment_id,
      failureReason: row.failure_reason,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
