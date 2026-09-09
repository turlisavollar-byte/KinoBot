import { Subscription } from '../domain/Subscription';

describe('Subscription Entity', () => {
  const baseParams = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    planId: '123e4567-e89b-12d3-a456-426614174001',
    currentPeriodStart: new Date('2025-01-01'),
    currentPeriodEnd: new Date('2025-02-01'),
  };

  describe('create', () => {
    it('should create an active subscription', () => {
      const sub = Subscription.create(baseParams);
      expect(sub.status).toBe('active');
      expect(sub.cancelAtPeriodEnd).toBe(false);
      expect(sub.canceledAt).toBeNull();
      expect(sub.trialEnd).toBeNull();
    });

    it('should create a trialing subscription when trialEnd is in the future', () => {
      const future = new Date();
      future.setDate(future.getDate() + 14);
      const sub = Subscription.create({ ...baseParams, trialEnd: future });
      expect(sub.status).toBe('trialing');
      expect(sub.trialEnd).toBe(future);
    });

    it('should create active subscription when trialEnd is in the past', () => {
      const past = new Date('2020-01-01');
      const sub = Subscription.create({ ...baseParams, trialEnd: past });
      expect(sub.status).toBe('active');
    });

    it('should throw if period start >= period end', () => {
      expect(() => Subscription.create({
        ...baseParams,
        currentPeriodStart: new Date('2025-02-01'),
        currentPeriodEnd: new Date('2025-01-01'),
      })).toThrow('currentPeriodStart must be before currentPeriodEnd');
    });
  });

  describe('cancel', () => {
    it('should cancel immediately', () => {
      const sub = Subscription.create(baseParams);
      sub.cancel(true);
      expect(sub.status).toBe('canceled');
      expect(sub.canceledAt).not.toBeNull();
    });

    it('should set cancelAtPeriodEnd when not immediate', () => {
      const sub = Subscription.create(baseParams);
      sub.cancel(false);
      expect(sub.status).toBe('active');
      expect(sub.cancelAtPeriodEnd).toBe(true);
    });

    it('should be idempotent', () => {
      const sub = Subscription.create(baseParams);
      sub.cancel(true);
      const firstCanceledAt = sub.canceledAt;
      sub.cancel(true);
      expect(sub.canceledAt).toBe(firstCanceledAt);
    });
  });

  describe('renew', () => {
    it('should renew and stay active if not flagged for cancel', () => {
      const sub = Subscription.create(baseParams);
      sub.renew(new Date('2025-02-01'), new Date('2025-03-01'));
      expect(sub.status).toBe('active');
      expect(sub.currentPeriodStart).toEqual(new Date('2025-02-01'));
      expect(sub.currentPeriodEnd).toEqual(new Date('2025-03-01'));
    });

    it('should cancel on renew if cancelAtPeriodEnd was set', () => {
      const sub = Subscription.create(baseParams);
      sub.cancel(false);
      sub.renew(new Date('2025-02-01'), new Date('2025-03-01'));
      expect(sub.status).toBe('canceled');
      expect(sub.canceledAt).not.toBeNull();
    });
  });

  describe('markPastDue / expire / activate', () => {
    it('should transition between states', () => {
      const sub = Subscription.create(baseParams);
      sub.markPastDue();
      expect(sub.status).toBe('past_due');
      sub.activate();
      expect(sub.status).toBe('active');
      sub.expire();
      expect(sub.status).toBe('expired');
    });
  });

  describe('isActive', () => {
    it('should return true for active and trialing', () => {
      const sub = Subscription.create(baseParams);
      expect(sub.isActive()).toBe(true);

      const future = new Date();
      future.setDate(future.getDate() + 7);
      const trialing = Subscription.create({ ...baseParams, trialEnd: future });
      expect(trialing.isActive()).toBe(true);
    });

    it('should return false for canceled', () => {
      const sub = Subscription.create(baseParams);
      sub.cancel(true);
      expect(sub.isActive()).toBe(false);
    });
  });
});
