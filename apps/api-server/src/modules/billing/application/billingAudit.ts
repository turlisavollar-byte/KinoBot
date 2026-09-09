import { logAuditEvent } from "@/shared/utils/audit";
import type { Payment } from "../domain";

export function auditPaymentCompleted(payment: Payment): void {
  if (process.env.NODE_ENV === "test") return;

  void logAuditEvent({
    action: "PAYMENT_COMPLETED",
    actorType: payment.provider === "manual" ? "SYSTEM" : "WEBHOOK",
    targetType: "PAYMENT",
    targetId: payment.id,
    metadata: {
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      invoiceId: payment.invoiceId,
      amountCents: payment.amountCents,
      currency: payment.currency,
    },
    tags: {
      billing: "payment",
      provider: payment.provider,
    },
    compliance: { pci: true },
  });
}

export function auditPaymentRefunded(payment: Payment): void {
  if (process.env.NODE_ENV === "test") return;

  void logAuditEvent({
    action: "PAYMENT_REFUNDED",
    actorType: "SYSTEM",
    targetType: "PAYMENT",
    targetId: payment.id,
    metadata: {
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      invoiceId: payment.invoiceId,
      amountCents: payment.amountCents,
      currency: payment.currency,
    },
    tags: {
      billing: "refund",
      provider: payment.provider,
    },
    compliance: { pci: true },
  });
}
