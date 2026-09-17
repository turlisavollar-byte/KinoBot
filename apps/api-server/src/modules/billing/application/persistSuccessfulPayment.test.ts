import { describe, expect, it, vi } from "vitest";
import { Invoice, Payment } from "../domain";
import { BusinessRuleError } from "@/shared/errors";
import { persistSuccessfulPayment } from "./persistSuccessfulPayment";

const userId = "123e4567-e89b-12d3-a456-426614174000";

function createInvoice() {
  return Invoice.create({
    userId,
    lineItems: [
      { description: "Monthly plan", quantity: 1, unitAmountCents: 5000 },
    ],
  });
}

function createPayment(
  invoice: Invoice,
  providerPaymentId: string,
  amountCents = 5000,
) {
  const payment = Payment.create({
    userId,
    invoiceId: invoice.id,
    amountCents,
    provider: "p2p",
    providerPaymentId,
  });
  payment.markSucceeded(providerPaymentId);
  return payment;
}

describe("persistSuccessfulPayment", () => {
  it("returns an existing payment for a duplicate webhook", async () => {
    const invoice = createInvoice();
    const existing = createPayment(invoice, "provider-1");
    const paymentRepo = {
      findByInvoiceId: vi.fn().mockResolvedValue([existing]),
      save: vi.fn(),
      saveAndSettle: vi.fn(),
    };
    const invoiceRepo = { update: vi.fn() };

    const result = await persistSuccessfulPayment(
      paymentRepo as any,
      invoiceRepo as any,
      invoice,
      createPayment(invoice, "provider-1"),
    );

    expect(result).toBe(existing);
    expect(paymentRepo.save).not.toHaveBeenCalled();
    expect(paymentRepo.saveAndSettle).not.toHaveBeenCalled();
  });

  it("rejects a payment that exceeds the invoice balance", async () => {
    const invoice = createInvoice();
    const paymentRepo = {
      findByInvoiceId: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    };

    await expect(
      persistSuccessfulPayment(
        paymentRepo as any,
        { update: vi.fn() } as any,
        invoice,
        createPayment(invoice, "provider-2", 5001),
      ),
    ).rejects.toThrow(BusinessRuleError);
  });

  it("settles the invoice through the atomic repository path", async () => {
    const invoice = createInvoice();
    const payment = createPayment(invoice, "provider-3");
    const saveAndSettle = vi.fn().mockResolvedValue(payment);
    const paymentRepo = {
      findByInvoiceId: vi.fn().mockResolvedValue([]),
      saveAndSettle,
      save: vi.fn(),
    };

    await persistSuccessfulPayment(
      paymentRepo as any,
      { update: vi.fn() } as any,
      invoice,
      payment,
    );

    expect(invoice.status).toBe("paid");
    expect(saveAndSettle).toHaveBeenCalledWith(payment, invoice);
  });
});
