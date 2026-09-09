import { CancelSubscriptionUseCase } from './CancelSubscriptionUseCase';
import { ISubscriptionRepository, Subscription } from '../domain';
import { NotFoundError } from '../../../shared/errors';

describe('CancelSubscriptionUseCase', () => {
  let useCase: CancelSubscriptionUseCase;
  let mockRepo: jest.Mocked<ISubscriptionRepository>;

  const subId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CancelSubscriptionUseCase(mockRepo);
  });

  it('should cancel immediately', async () => {
    const sub = Subscription.create({
      userId: '123e4567-e89b-12d3-a456-426614174001',
      planId: '123e4567-e89b-12d3-a456-426614174002',
      currentPeriodStart: new Date('2025-01-01'),
      currentPeriodEnd: new Date('2025-02-01'),
    });
    mockRepo.findById.mockResolvedValue(sub);
    mockRepo.update.mockResolvedValue(sub);

    await useCase.execute({ id: subId, immediate: true });

    expect(sub.status).toBe('canceled');
    expect(mockRepo.update).toHaveBeenCalledTimes(1);
  });

  it('should set cancelAtPeriodEnd when not immediate', async () => {
    const sub = Subscription.create({
      userId: '123e4567-e89b-12d3-a456-426614174001',
      planId: '123e4567-e89b-12d3-a456-426614174002',
      currentPeriodStart: new Date('2025-01-01'),
      currentPeriodEnd: new Date('2025-02-01'),
    });
    mockRepo.findById.mockResolvedValue(sub);
    mockRepo.update.mockResolvedValue(sub);

    await useCase.execute({ id: subId, immediate: false });

    expect(sub.cancelAtPeriodEnd).toBe(true);
    expect(sub.status).toBe('active');
  });

  it('should throw NotFoundError if subscription does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ id: subId, immediate: true })).rejects.toThrow(NotFoundError);
  });
});
