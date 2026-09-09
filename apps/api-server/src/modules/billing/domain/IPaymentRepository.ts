import { Invoice } from "./Invoice";
import { Payment } from "./Payment";
import { PaginatedResult, PaginationParams } from "@/shared/types";

export interface IPaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findAll(pagination: PaginationParams): Promise<PaginatedResult<Payment>>;
  findByUserId(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Payment>>;
  findByInvoiceId(invoiceId: string): Promise<Payment[]>;
  save(payment: Payment): Promise<Payment>;
  saveAndSettle?(payment: Payment, invoice: Invoice): Promise<Payment>;
  updateAndAuditRefund?(payment: Payment): Promise<Payment>;
  update(payment: Payment): Promise<Payment>;
  delete(id: string): Promise<void>;
}
