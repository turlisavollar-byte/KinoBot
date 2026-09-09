import { Invoice } from "./Invoice";
import { PaginatedResult, PaginationParams } from "@/shared/types";

export interface IInvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
  findByIdempotencyKey?(key: string): Promise<Invoice | null>;
  findByUserId(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Invoice>>;
  findBySubscriptionId(subscriptionId: string): Promise<Invoice[]>;
  save(invoice: Invoice): Promise<Invoice>;
  update(invoice: Invoice): Promise<Invoice>;
  delete(id: string): Promise<void>;
}
