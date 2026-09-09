import { HandleOctoWebhookUseCase } from './HandleOctoWebhookUseCase';
import { IPaymentRepository, IInvoiceRepository, Invoice, Payment } from '../domain';
import { OctoService } from '../infrastructure/OctoService';

describe('HandleOctoWebhookUseCase', () => {
  let useCase: HandleOctoWebhookUseCase;
  let mockPaymentRepo: jest.Mocked<IPaymentRepository>;
  let mockInvoiceRepo: jest.Mocked<IInvoiceRepository>;
  let octoService: OctoService;

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
    octoService = new OctoService('merchant-id', 'shop-id', 'secret-key');
    useCase = new HandleOctoWebhookUseCase(mockPaymentRepo, mockInvoiceRepo, octoService);
  });

  function generateValidSign(orderId: string, transactionId: string, amount: number, status: string, timestamp: string): string {
    const crypto = require('crypto');
    const payload = `${orderId}${transactionId}${amount}${status}${timestamp}secret-key`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  it('should process successful payment and mark invoice paid', async () => {
    const invoice = Invoice.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 50000 }],
    });
    mockInvoiceRepo.findById.mockResolvedValue(invoice);
    mockPaymentRepo.save.mockImplementation(async (p) => p);
    mockInvoiceRepo.update.mockResolvedValue(invoice);

    const timestamp = '2025-01-01T00:00:00Z';
    const webhook = {
      transactionId: 'octo-txn-123',
      orderId: invoice.id,
      amount: 500,
      status: 'paid' as const,
      sign: generateValidSign(invoice.id, 'octo-txn-123', 500, 'paid', timestamp),
      timestamp,
    };

    const result = await useCase.execute(webhook);

    expect(result.status).toBe('ok');
    expect(mockPaymentRepo.save).toHaveBeenCalledTimes(1);
    expect(mockInvoiceRepo.update).toHaveBeenCalledTimes(1);
  });

  it('should reject invalid signature', async () => {
    const webhook = {
      transactionId: 'txn-123',
      orderId: 'test-order',
      amount: 500,
      status: 'paid' as const,
      sign: 'invalid-signature',
      timestamp: '2025-01-01T00:00:00Z',
    };

    const result = await useCase.execute(webhook);

    expect(result.status).toBe('error');
    expect(result.message).toBe('Invalid signature');
  });

  it('should return error if invoice not found', async () => {
    mockInvoiceRepo.findById.mockResolvedValue(null);

    const timestamp = '2025-01-01T00:00:00Z';
    const webhook = {
      transactionId: 'txn-123',
      orderId: 'nonexistent',
      amount: 500,
      status: 'paid' as const,
      sign: generateValidSign('nonexistent', 'txn-123', 500, 'paid', timestamp),
      timestamp,
    };

    const result = await useCase.execute(webhook);

    expect(result.status).toBe('error');
    expect(result.message).toBe('Invoice not found');
  });

  it('should handle refund webhook and refund payment', async () => {
    const invoice = Invoice.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 50000 }],
    });
    const payment = Payment.create({
      userId: invoice.userId,
      invoiceId: invoice.id,
      amountCents: 50000,
      provider: 'octo',
    });
    payment.markSucceeded('octo-txn-123');

    mockInvoiceRepo.findById.mockResolvedValue(invoice);
    mockPaymentRepo.findByInvoiceId.mockResolvedValue([payment]);
    mockPaymentRepo.update.mockResolvedValue(payment);

    const timestamp = '2025-01-01T00:00:00Z';
    const webhook = {
      transactionId: 'octo-txn-123',
      orderId: invoice.id,
      amount: 500,
      status: 'refunded' as const,
      sign: generateValidSign(invoice.id, 'octo-txn-123', 500, 'refunded', timestamp),
      timestamp,
    };

    const result = await useCase.execute(webhook);

    expect(result.status).toBe('ok');
    expect(payment.status).toBe('refunded');
    expect(mockPaymentRepo.update).toHaveBeenCalledTimes(1);
  });

  it('should not double-process if invoice is already paid', async () => {
    const invoice = Invoice.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 50000 }],
    });
    invoice.markPaid();
    mockInvoiceRepo.findById.mockResolvedValue(invoice);

    const timestamp = '2025-01-01T00:00:00Z';
    const webhook = {
      transactionId: 'octo-txn-123',
      orderId: invoice.id,
      amount: 500,
      status: 'paid' as const,
      sign: generateValidSign(invoice.id, 'octo-txn-123', 500, 'paid', timestamp),
      timestamp,
    };

    const result = await useCase.execute(webhook);

    expect(result.status).toBe('ok');
    expect(mockPaymentRepo.save).not.toHaveBeenCalled();
    expect(mockInvoiceRepo.update).not.toHaveBeenCalled();
  });

  it('should acknowledge failed payment webhook', async () => {
    const invoice = Invoice.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 50000 }],
    });
    mockInvoiceRepo.findById.mockResolvedValue(invoice);

    const timestamp = '2025-01-01T00:00:00Z';
    const webhook = {
      transactionId: 'octo-txn-123',
      orderId: invoice.id,
      amount: 500,
      status: 'failed' as const,
      sign: generateValidSign(invoice.id, 'octo-txn-123', 500, 'failed', timestamp),
      timestamp,
    };

    const result = await useCase.execute(webhook);

    expect(result.status).toBe('ok');
    expect(result.message).toBe('Payment failure acknowledged');
    expect(mockPaymentRepo.save).not.toHaveBeenCalled();
  });
});
