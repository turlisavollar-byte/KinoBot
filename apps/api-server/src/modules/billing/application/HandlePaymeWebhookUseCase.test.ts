import { HandlePaymeWebhookUseCase } from './HandlePaymeWebhookUseCase';
import { IPaymentRepository, IInvoiceRepository, Invoice, Payment } from '../domain';
import { PaymeService } from '../infrastructure/PaymeService';

describe('HandlePaymeWebhookUseCase', () => {
  let useCase: HandlePaymeWebhookUseCase;
  let mockPaymentRepo: jest.Mocked<IPaymentRepository>;
  let mockInvoiceRepo: jest.Mocked<IInvoiceRepository>;
  let paymeService: PaymeService;

  beforeEach(() => {
    mockPaymentRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByInvoiceId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockInvoiceRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findBySubscriptionId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    paymeService = new PaymeService('merchant-id', 'secret-key');
    useCase = new HandlePaymeWebhookUseCase(mockPaymentRepo, mockInvoiceRepo, paymeService);
  });

  it('should reject request with invalid auth', async () => {
    const result = await useCase.execute('Basic invalid', {
      id: 1,
      method: 'CheckTransaction',
      params: { id: 'test' },
    });

    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe(-32504);
  });

  it('should handle PerformTransaction and mark invoice paid', async () => {
    const invoice = Invoice.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 50000 }],
    });
    mockInvoiceRepo.findById.mockResolvedValue(invoice);
    mockPaymentRepo.save.mockImplementation(async (p) => p);
    mockInvoiceRepo.update.mockResolvedValue(invoice);

    const validAuth = 'Basic ' + Buffer.from('Paycom:secret-key').toString('base64');

    const result = await useCase.execute(validAuth, {
      id: 1,
      method: 'PerformTransaction',
      params: { transaction: invoice.id },
    });

    expect(result.error).toBeUndefined();
    expect(result.result).toBeDefined();
    expect(result.result!.state).toBe(2);
    expect(mockPaymentRepo.save).toHaveBeenCalledTimes(1);
    expect(mockInvoiceRepo.update).toHaveBeenCalledTimes(1);
  });

  it('should return error if invoice not found', async () => {
    mockInvoiceRepo.findById.mockResolvedValue(null);

    const validAuth = 'Basic ' + Buffer.from('Paycom:secret-key').toString('base64');

    const result = await useCase.execute(validAuth, {
      id: 1,
      method: 'PerformTransaction',
      params: { transaction: 'nonexistent' },
    });

    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe(-31050);
  });

  it('should return error if invoice is not open', async () => {
    const invoice = Invoice.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 50000 }],
    });
    invoice.markPaid();
    mockInvoiceRepo.findById.mockResolvedValue(invoice);

    const validAuth = 'Basic ' + Buffer.from('Paycom:secret-key').toString('base64');

    const result = await useCase.execute(validAuth, {
      id: 1,
      method: 'PerformTransaction',
      params: { transaction: invoice.id },
    });

    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe(-31008);
  });

  it('should handle CancelTransaction and refund payment', async () => {
    const payment = Payment.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      invoiceId: '123e4567-e89b-12d3-a456-426614174001',
      amountCents: 50000,
      provider: 'payme',
    });
    payment.markSucceeded('txn-123');
    mockPaymentRepo.findByInvoiceId.mockResolvedValue([payment]);
    mockPaymentRepo.update.mockResolvedValue(payment);

    const validAuth = 'Basic ' + Buffer.from('Paycom:secret-key').toString('base64');

    const result = await useCase.execute(validAuth, {
      id: 1,
      method: 'CancelTransaction',
      params: { transaction: 'invoice-id' },
    });

    expect(result.result).toBeDefined();
    expect(result.result!.state).toBe(-1);
    expect(payment.status).toBe('refunded');
    expect(mockPaymentRepo.update).toHaveBeenCalledTimes(1);
  });
});
