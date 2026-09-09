import { CreateSubscriptionUseCase } from './CreateSubscriptionUseCase';
import { ISubscriptionRepository, IBillingPlanRepository, BillingPlan, Subscription } from '../domain';
import { NotFoundError, BusinessRuleError } from '../../../shared/errors';

describe('CreateSubscriptionUseCase', () => {
  let useCase: CreateSubscriptionUseCase;
  let mockSubRepo: jest.Mocked<ISubscriptionRepository>;
  let mockPlanRepo: jest.Mocked<IBillingPlanRepository>;

  const planId = '123e4567-e89b-12d3-a456-426614174001';
  const userId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    mockSubRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockPlanRepo = {
      findById: jest.fn(),
      findActive: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateSubscriptionUseCase(mockSubRepo, mockPlanRepo);
  });

  it('should create a monthly subscription', async () => {
    const plan = BillingPlan.create({ name: 'Pro', priceCents: 1999, interval: 'monthly' });
    mockPlanRepo.findById.mockResolvedValue(plan);
    mockSubRepo.findActiveByUserId.mockResolvedValue(null);
    mockSubRepo.save.mockImplementation(async (sub) => sub);

    const result = await useCase.execute({ userId, planId, metadata: {} });

    expect(result.status).toBe('active');
    expect(result.planId).toBe(planId);
    expect(mockSubRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should create a trialing subscription with trialDays', async () => {
    const plan = BillingPlan.create({ name: 'Pro', priceCents: 1999, interval: 'monthly' });
    mockPlanRepo.findById.mockResolvedValue(plan);
    mockSubRepo.findActiveByUserId.mockResolvedValue(null);
    mockSubRepo.save.mockImplementation(async (sub) => sub);

    const result = await useCase.execute({ userId, planId, trialDays: 14, metadata: {} });

    expect(result.status).toBe('trialing');
    expect(result.trialEnd).not.toBeNull();
  });

  it('should throw NotFoundError if plan does not exist', async () => {
    mockPlanRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ userId, planId, metadata: {} })).rejects.toThrow(NotFoundError);
  });

  it('should throw BusinessRuleError if plan is not active', async () => {
    const plan = BillingPlan.create({ name: 'Pro', priceCents: 1999, interval: 'monthly' });
    plan.deactivate();
    mockPlanRepo.findById.mockResolvedValue(plan);

    await expect(useCase.execute({ userId, planId, metadata: {} })).rejects.toThrow(BusinessRuleError);
  });

  it('should throw BusinessRuleError if user already has active subscription', async () => {
    const plan = BillingPlan.create({ name: 'Pro', priceCents: 1999, interval: 'monthly' });
    mockPlanRepo.findById.mockResolvedValue(plan);
    const existingSub = Subscription.create({
      userId, planId,
      currentPeriodStart: new Date('2025-01-01'),
      currentPeriodEnd: new Date('2025-02-01'),
    });
    mockSubRepo.findActiveByUserId.mockResolvedValue(existingSub);

    await expect(useCase.execute({ userId, planId, metadata: {} })).rejects.toThrow(BusinessRuleError);
  });
});
