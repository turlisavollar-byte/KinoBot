import { Payment } from '../domain/Payment';

describe('Payment Entity', () => {
  const baseParams = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    invoiceId: '123e4567-e89b-12d3-a456-426614174001',
    amountCents: 1999,
  };

  describe('create', () => {
    it('should create a pending payment', () => {
      const payment = Payment.create(baseParams);
      expect(payment.status).toBe('pending');
      expect(payment.provider).toBe('manual');
      expect(payment.providerPaymentId).toBeNull();
      expect(payment.failureReason).toBeNull();
    });

    it('should throw if amount is negative', () => {
      expect(() => Payment.create({ ...baseParams, amountCents: -1 })).toThrow('amountCents must be >= 0');
    });

    it('should throw if invoiceId missing', () => {
      expect(() => Payment.create({ ...baseParams, invoiceId: '' })).toThrow('invoiceId is required');
    });
  });

  describe('markSucceeded', () => {
    it('should mark as succeeded', () => {
      const payment = Payment.create(baseParams);
      payment.markSucceeded('ext_pay_123');
      expect(payment.status).toBe('succeeded');
      expect(payment.providerPaymentId).toBe('ext_pay_123');
      expect(payment.failureReason).toBeNull();
      expect(payment.isSucceeded()).toBe(true);
    });

    it('should be idempotent', () => {
      const payment = Payment.create(baseParams);
      payment.markSucceeded('ext_pay_123');
      payment.markSucceeded('ext_pay_456');
      expect(payment.providerPaymentId).toBe('ext_pay_123');
    });
  });

  describe('markFailed', () => {
    it('should mark as failed with reason', () => {
      const payment = Payment.create(baseParams);
      payment.markFailed('Insufficient funds');
      expect(payment.status).toBe('failed');
      expect(payment.failureReason).toBe('Insufficient funds');
    });
  });

  describe('refund', () => {
    it('should refund a succeeded payment', () => {
      const payment = Payment.create(baseParams);
      payment.markSucceeded('ext_pay_123');
      payment.refund();
      expect(payment.status).toBe('refunded');
    });

    it('should throw if refunding a non-succeeded payment', () => {
      const payment = Payment.create(baseParams);
      expect(() => payment.refund()).toThrow('Can only refund a succeeded payment');
    });
  });
});
