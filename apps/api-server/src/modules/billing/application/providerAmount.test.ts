import { providerAmountMatchesInvoice } from "./providerAmount";

describe("providerAmountMatchesInvoice", () => {
  it("accepts the exact invoice amount in provider units", () => {
    expect(providerAmountMatchesInvoice(50000, 500)).toBe(true);
  });

  it("accepts harmless decimal representation drift", () => {
    expect(providerAmountMatchesInvoice(9999, 99.99)).toBe(true);
  });

  it("rejects underpayment, overpayment, non-finite, and negative values", () => {
    expect(providerAmountMatchesInvoice(50000, 499.98)).toBe(false);
    expect(providerAmountMatchesInvoice(50000, 500.02)).toBe(false);
    expect(providerAmountMatchesInvoice(50000, Number.NaN)).toBe(false);
    expect(providerAmountMatchesInvoice(50000, Number.POSITIVE_INFINITY)).toBe(
      false,
    );
    expect(providerAmountMatchesInvoice(50000, -1)).toBe(false);
  });

  it("supports providers that report minor units directly", () => {
    expect(providerAmountMatchesInvoice(50000, 50000, 1)).toBe(true);
    expect(providerAmountMatchesInvoice(50000, 500, 1)).toBe(false);
  });
});
