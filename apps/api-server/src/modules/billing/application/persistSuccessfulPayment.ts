import type {
  IInvoiceRepository,
  IPaymentRepository,
  Invoice,
  Payment,
} from "../domain";
import { BusinessRuleError } from "@/shared/errors";
import { auditPaymentCompleted } from "./billingAudit";

export async function persistSuccessfulPayment(
  paymentRepo: IPaymentRepository,
  invoiceRepo: IInvoiceRepository,
  invoice: Invoice,
  payment: Payment,
): Promise<Payment | null> {
  const existingPayments =
    (await paymentRepo.findByInvoiceId(invoice.id)) ?? [];
  const duplicate = existingPayments.find(
    (existing) =>
      existing.provider === payment.provider &&
      existing.providerPaymentId === payment.providerPaymentId,
  );
  if (duplicate) return duplicate;
  if (!invoice.isOpen()) return null;

  const settledAmountCents = existingPayments
    .filter((existing) => existing.isSucceeded())
    .reduce((total, existing) => total + existing.amountCents, 0);
  if (payment.amountCents > invoice.amountCents - settledAmountCents) {
    throw new BusinessRuleError("Payment amount exceeds invoice amount");
  }

  const shouldSettle =
    settledAmountCents + payment.amountCents >= invoice.amountCents;
  if (shouldSettle) invoice.markPaid();

  if (paymentRepo.saveAndSettle) {
    return paymentRepo.saveAndSettle(payment, invoice);
  }

  const saved = await paymentRepo.save(payment);
  if (shouldSettle) await invoiceRepo.update(invoice);
  auditPaymentCompleted(saved);
  return saved;
}
