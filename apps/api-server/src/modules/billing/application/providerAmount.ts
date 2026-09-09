export function providerAmountMatchesInvoice(
  invoiceAmountCents: number,
  providerAmount: number,
  divisor = 100,
): boolean {
  if (!Number.isFinite(providerAmount) || providerAmount < 0) return false;
  return Math.abs(providerAmount - invoiceAmountCents / divisor) <= 0.01;
}
