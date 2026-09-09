import { Invoice } from '../domain/Invoice';

describe('Invoice Entity', () => {
  describe('create', () => {
    it('should create an open invoice with calculated total', () => {
      const invoice = Invoice.create({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        lineItems: [
          { description: 'Pro plan', quantity: 1, unitAmountCents: 1999 },
          { description: 'Add-on', quantity: 2, unitAmountCents: 500 },
        ],
      });

      expect(invoice.amountCents).toBe(1999 + 500 * 2);
      expect(invoice.status).toBe('open');
      expect(invoice.paidAt).toBeNull();
      expect(invoice.lineItems).toHaveLength(2);
    });

    it('should throw if no line items', () => {
      expect(() => Invoice.create({ userId: 'user-1', lineItems: [] })).toThrow('At least one line item is required');
    });

    it('should throw if userId missing', () => {
      expect(() => Invoice.create({ userId: '', lineItems: [{ description: 'X', quantity: 1, unitAmountCents: 100 }] })).toThrow('userId is required');
    });
  });

  describe('markPaid', () => {
    it('should mark as paid', () => {
      const invoice = Invoice.create({
        userId: 'user-1',
        lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 100 }],
      });
      invoice.markPaid();
      expect(invoice.status).toBe('paid');
      expect(invoice.paidAt).not.toBeNull();
      expect(invoice.isPaid()).toBe(true);
    });

    it('should be idempotent', () => {
      const invoice = Invoice.create({
        userId: 'user-1',
        lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 100 }],
      });
      invoice.markPaid();
      const firstPaidAt = invoice.paidAt;
      invoice.markPaid();
      expect(invoice.paidAt).toBe(firstPaidAt);
    });

    it('should throw if trying to pay a void invoice', () => {
      const invoice = Invoice.create({
        userId: 'user-1',
        lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 100 }],
      });
      invoice.void();
      expect(() => invoice.markPaid()).toThrow('Cannot pay a void invoice');
    });
  });

  describe('void', () => {
    it('should void an open invoice', () => {
      const invoice = Invoice.create({
        userId: 'user-1',
        lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 100 }],
      });
      invoice.void();
      expect(invoice.status).toBe('void');
    });

    it('should throw if trying to void a paid invoice', () => {
      const invoice = Invoice.create({
        userId: 'user-1',
        lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 100 }],
      });
      invoice.markPaid();
      expect(() => invoice.void()).toThrow('Cannot void a paid invoice');
    });
  });

  describe('markUncollectible', () => {
    it('should mark as uncollectible', () => {
      const invoice = Invoice.create({
        userId: 'user-1',
        lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 100 }],
      });
      invoice.markUncollectible();
      expect(invoice.status).toBe('uncollectible');
    });
  });
});
