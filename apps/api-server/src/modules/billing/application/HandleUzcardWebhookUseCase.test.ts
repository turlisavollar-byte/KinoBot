import { HandleUzcardWebhookUseCase } from './HandleUzcardWebhookUseCase';
import { IPaymentRepository, IInvoiceRepository, Invoice, Payment } from '../domain';
import { UzcardService } from '../infrastructure/UzcardService';

describe('HandleUzcardWebhookUseCase', () => {
  let useCase: HandleUzcardWebhookUseCase;
  let mockPaymentRepo: jest.Mocked<IPaymentRepository>;
  let mockInvoiceRepo: jest.Mocked<IInvoiceRepository>;
  let uzcardService: UzcardService;

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
    uzcardService = new UzcardService('merchant-id', 'terminal-id', 'secret-key');
    useCase = new HandleUzcardWebhookUseCase(mockPaymentRepo, mockInvoiceRepo, uzcardService);
  });

  function generateValidSign(orderId: string, transactionId: string, amount: number, cardType: string, status: string, timestamp: string): string {
    const crypto = require('crypto');
    const payload = `${orderId}${transactionId}${amount}${cardType}${status}${timestamp}secret-key`;
    return crypto.createHash('sha1').update(payload).digest('hex');
  }

  it('should process successful Uzcard payment and mark invoice paid', async () => {
    const invoice = Invoice.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 50000 }],
    });
    mockInvoiceRepo.findById.mockResolvedValue(invoice);
    mockPaymentRepo.save.mockImplementation(async (p) => p);
    mockInvoiceRepo.update.mockResolvedValue(invoice);

    const timestamp = '2025-01-01T00:00:00Z';
    const webhook = {
      transactionId: 'uzcard-txn-123',
      orderId: invoice.id,
      amount: 500,
      cardType: 'uzcard' as const,
      status: 'success' as const,
      sign: generateValidSign(invoice.id, 'uzcard-txn-123', 500, 'uzcard', 'success', timestamp),
      timestamp,
    };

    const result = await useCase.execute(webhook);

    expect(result.status).toBe('ok');
    expect(mockPaymentRepo.save).toHaveBeenCalledTimes(1);
    expect(mockInvoiceRepo.update).toHaveBeenCalledTimes(1);
  });

  it('should process successful Humo payment and mark invoice paid', async () => {
    const invoice = Invoice.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 50000 }],
    });
    mockInvoiceRepo.findById.mockResolvedValue(invoice);
    mockPaymentRepo.save.mockImplementation(async (p) => p);
    mockInvoiceRepo.update.mockResolvedValue(invoice);

    const timestamp = '2025-01-01T00:00:00Z';
    const webhook = {
      transactionId: 'humo-txn-123',
      orderId: invoice.id,
      amount: 500,
      cardType: 'humo' as const,
      status: 'success' as const,
      sign: generateValidSign(invoice.id, 'humo-txn-123', 500, 'humo', 'success', timestamp),
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
      cardType: 'uzcard' as const,
      status: 'success' as const,
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
      cardType: 'uzcard' as const,
      status: 'success' as const,
      sign: generateValidSign('nonexistent', 'txn-123', 500, 'uzcard', 'success', timestamp),
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
      provider: 'uzcard',
    });
    payment.markSucceeded('uzcard-txn-123');

    mockInvoiceRepo.findById.mockResolvedValue(invoice);
    mockPaymentRepo.findByInvoiceId.mockResolvedValue([payment]);
    mockPaymentRepo.update.mockResolvedValue(payment);

    const timestamp = '2025-01-01T00:00:00Z';
    const webhook = {
      transactionId: 'uzcard-txn-123',
      orderId: invoice.id,
      amount: 500,
      cardType: 'uzcard' as const,
      status: 'refunded' as const,
      sign: generateValidSign(invoice.id, 'uzcard-txn-123', 500, 'uzcard', 'refunded', timestamp),
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
      transactionId: 'uzcard-txn-123',
      orderId: invoice.id,
      amount: 500,
      cardType: 'uzcard' as const,
      status: 'success' as const,
      sign: generateValidSign(invoice.id, 'uzcard-txn-123', 500, 'uzcard', 'success', timestamp),
      timestamp,
    };

    const result = await useCase.execute(webhook);

    expect(result.status).toBe('ok');
    expect(mockPaymentRepo.save).not.toHaveBeenCalled();
    expect(mockInvoiceRepo.update).not.toHaveBeenCalled();
  });

  it('should store card type in payment metadata', async () => {
    const invoice = Invoice.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 50000 }],
    });
    mockInvoiceRepo.findById.mockResolvedValue(invoice);
    let savedPayment: Payment | null = null;
    mockPaymentRepo.save.mockImplementation(async (p) => { savedPayment = p; return p; });
    mockInvoiceRepo.update.mockResolvedValue(invoice);

    const timestamp = '2025-01-01T00:00:00Z';
    const webhook = {
      transactionId: 'humo-txn-456',
      orderId: invoice.id,
      amount: 500,
      cardType: 'humo' as const,
      status: 'success' as const,
      sign: generateValidSign(invoice.id, 'humo-txn-456', 500, 'humo', 'success', timestamp),
      timestamp,
    };

    await useCase.execute(webhook);

    expect(savedPayment).not.toBeNull();
    expect(savedPayment!.metadata).toHaveProperty('card_type', 'humo');
  });
});
