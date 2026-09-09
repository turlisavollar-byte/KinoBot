import { RefundPaymentUseCase } from './RefundPaymentUseCase';
import { IPaymentRepository, Payment } from '../domain';
import { NotFoundError, BusinessRuleError } from '../../../shared/errors';

describe('RefundPaymentUseCase', () => {
  let useCase: RefundPaymentUseCase;
  let mockRepo: jest.Mocked<IPaymentRepository>;

  const paymentId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByInvoiceId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new RefundPaymentUseCase(mockRepo);
  });

  it('should refund a succeeded payment', async () => {
    const payment = Payment.create({
      userId: '123e4567-e89b-12d3-a456-426614174001',
      invoiceId: '123e4567-e89b-12d3-a456-426614174002',
      amountCents: 1999,
    });
    payment.markSucceeded('ext_pay_123');
    mockRepo.findById.mockResolvedValue(payment);
    mockRepo.update.mockResolvedValue(payment);

    await useCase.execute(paymentId);

    expect(payment.status).toBe('refunded');
    expect(mockRepo.update).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundError if payment does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute(paymentId)).rejects.toThrow(NotFoundError);
  });

  it('should throw BusinessRuleError if payment is not succeeded', async () => {
    const payment = Payment.create({
      userId: '123e4567-e89b-12d3-a456-426614174001',
      invoiceId: '123e4567-e89b-12d3-a456-426614174002',
      amountCents: 1999,
    });
    mockRepo.findById.mockResolvedValue(payment);

    await expect(useCase.execute(paymentId)).rejects.toThrow(BusinessRuleError);
  });
});
