import { HandleClickWebhookUseCase } from './HandleClickWebhookUseCase';
import { IPaymentRepository, IInvoiceRepository, Invoice } from '../domain';
import { ClickService } from '../infrastructure/ClickService';

describe('HandleClickWebhookUseCase', () => {
  let useCase: HandleClickWebhookUseCase;
  let mockPaymentRepo: jest.Mocked<IPaymentRepository>;
  let mockInvoiceRepo: jest.Mocked<IInvoiceRepository>;
  let clickService: ClickService;

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
    clickService = new ClickService('merchant', 'service', 'secret', 'user');
    useCase = new HandleClickWebhookUseCase(mockPaymentRepo, mockInvoiceRepo, clickService);
  });

  it('should handle PREPARE action with valid signature', async () => {
    const invoice = Invoice.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      lineItems: [{ description: 'Test', quantity: 1, unitAmountCents: 10000 }],
    });
    mockInvoiceRepo.findById.mockResolvedValue(invoice);

    const crypto = require('crypto');
    const webhook = {
      click_trans_id: 12345,
      service_id: NaN,
      click_paydoc_id: 67890,
      merchant_trans_id: invoice.id,
      amount: 100,
      action: 0,
      error: 0,
      sign_time: '2025-01-01 00:00:00',
      sign_string: '',
    };
    // Override service_id with the correct string
    webhook.service_id = 'service' as any;
    const signSource = `${webhook.click_trans_id}${webhook.service_id}secret${webhook.merchant_trans_id}${webhook.amount}${webhook.action}${webhook.sign_time}`;
    webhook.sign_string = crypto.createHash('md5').update(signSource).digest('hex');

    const result = await useCase.execute(webhook);

    expect(result.error).toBe(0);
    expect(result.error_note).toBe('Success');
  });

  it('should reject invalid signature', async () => {
    const webhook = {
      click_trans_id: 12345,
      service_id: 'service' as any,
      click_paydoc_id: 67890,
      merchant_trans_id: 'test-invoice',
      amount: 100,
      action: 0,
      error: 0,
      sign_time: '2025-01-01 00:00:00',
      sign_string: 'invalid-signature',
    };

    const result = await useCase.execute(webhook);

    expect(result.error).toBe(-1);
    expect(result.error_note).toBe('Invalid signature');
  });

  it('should return error for unknown action', async () => {
    const result = await useCase.execute({
      click_trans_id: 12345,
      service_id: 'service' as any,
      click_paydoc_id: 67890,
      merchant_trans_id: 'test',
      amount: 100,
      action: 99,
      error: 0,
      sign_time: '2025-01-01 00:00:00',
      sign_string: 'test',
    });

    expect(result.error).toBe(-8);
  });
});
