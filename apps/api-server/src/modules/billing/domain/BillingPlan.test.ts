import { BillingPlan } from '../domain/BillingPlan';

describe('BillingPlan Entity', () => {
  describe('create', () => {
    it('should create a plan with default values', () => {
      const plan = BillingPlan.create({
        name: 'Pro',
        priceCents: 1999,
        interval: 'monthly',
      });

      expect(plan.id).toBeDefined();
      expect(plan.name).toBe('Pro');
      expect(plan.priceCents).toBe(1999);
      expect(plan.currency).toBe('usd');
      expect(plan.interval).toBe('monthly');
      expect(plan.isActive).toBe(true);
      expect(plan.metadata).toEqual({});
    });

    it('should throw if name is missing', () => {
      expect(() => BillingPlan.create({ name: '', priceCents: 100, interval: 'monthly' })).toThrow('name is required');
    });

    it('should throw if priceCents is negative', () => {
      expect(() => BillingPlan.create({ name: 'Pro', priceCents: -1, interval: 'monthly' })).toThrow('priceCents must be >= 0');
    });
  });

  describe('activate / deactivate', () => {
    it('should deactivate and activate a plan', () => {
      const plan = BillingPlan.create({ name: 'Pro', priceCents: 1999, interval: 'monthly' });
      plan.deactivate();
      expect(plan.isActive).toBe(false);
      plan.activate();
      expect(plan.isActive).toBe(true);
    });
  });

  describe('updatePrice', () => {
    it('should update the price', () => {
      const plan = BillingPlan.create({ name: 'Pro', priceCents: 1999, interval: 'monthly' });
      plan.updatePrice(2999);
      expect(plan.priceCents).toBe(2999);
    });

    it('should throw if price is negative', () => {
      const plan = BillingPlan.create({ name: 'Pro', priceCents: 1999, interval: 'monthly' });
      expect(() => plan.updatePrice(-1)).toThrow('priceCents must be >= 0');
    });
  });
});
