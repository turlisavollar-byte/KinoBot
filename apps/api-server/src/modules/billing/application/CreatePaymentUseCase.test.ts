import { CreatePaymentUseCase } from "./CreatePaymentUseCase";
import {
  IPaymentRepository,
  IInvoiceRepository,
  Invoice,
  Payment,
} from "../domain";
import { NotFoundError, BusinessRuleError } from "../../../shared/errors";

describe("CreatePaymentUseCase", () => {
  let useCase: CreatePaymentUseCase;
  let mockPaymentRepo: jest.Mocked<IPaymentRepository>;
  let mockInvoiceRepo: jest.Mocked<IInvoiceRepository>;

  const invoiceId = "123e4567-e89b-12d3-a456-426614174000";
  const userId = "123e4567-e89b-12d3-a456-426614174001";

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
    useCase = new CreatePaymentUseCase(mockPaymentRepo, mockInvoiceRepo);
  });

  it("should create a succeeded payment and mark invoice as paid", async () => {
    const invoice = Invoice.create({
      userId,
      lineItems: [
        { description: "Pro plan", quantity: 1, unitAmountCents: 1999 },
      ],
    });
    mockInvoiceRepo.findById.mockResolvedValue(invoice);
    mockPaymentRepo.save.mockImplementation(async (p) => p);
    mockInvoiceRepo.update.mockResolvedValue(invoice);

    const result = await useCase.execute({
      invoiceId: invoice.id,
      amountCents: 1999,
      currency: "usd",
      provider: "manual",
      providerPaymentId: undefined,
      metadata: {},
    });

    expect(result.status).toBe("succeeded");
    expect(invoice.status).toBe("paid");
    expect(mockInvoiceRepo.update).toHaveBeenCalledTimes(1);
  });

  it("should throw NotFoundError if invoice does not exist", async () => {
    mockInvoiceRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        invoiceId,
        amountCents: 100,
        currency: "usd",
        provider: "manual",
        metadata: {},
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw BusinessRuleError if invoice is not open", async () => {
    const invoice = Invoice.create({
      userId,
      lineItems: [{ description: "Test", quantity: 1, unitAmountCents: 100 }],
    });
    invoice.markPaid();
    mockInvoiceRepo.findById.mockResolvedValue(invoice);

    await expect(
      useCase.execute({
        invoiceId: invoice.id,
        amountCents: 100,
        currency: "usd",
        provider: "manual",
        metadata: {},
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it("should throw BusinessRuleError if payment exceeds invoice amount", async () => {
    const invoice = Invoice.create({
      userId,
      lineItems: [{ description: "Test", quantity: 1, unitAmountCents: 100 }],
    });
    mockInvoiceRepo.findById.mockResolvedValue(invoice);

    await expect(
      useCase.execute({
        invoiceId: invoice.id,
        amountCents: 200,
        currency: "usd",
        provider: "manual",
        metadata: {},
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it("should not mark invoice as paid for partial payment", async () => {
    const invoice = Invoice.create({
      userId,
      lineItems: [{ description: "Test", quantity: 1, unitAmountCents: 2000 }],
    });
    mockInvoiceRepo.findById.mockResolvedValue(invoice);
    mockPaymentRepo.save.mockImplementation(async (p) => p);
    mockInvoiceRepo.update.mockResolvedValue(invoice);

    await useCase.execute({
      invoiceId: invoice.id,
      amountCents: 1000,
      currency: "usd",
      provider: "manual",
      metadata: {},
    });

    expect(invoice.status).toBe("open");
    expect(mockInvoiceRepo.update).not.toHaveBeenCalled();
  });

  it("should reject payments that exceed the remaining invoice balance", async () => {
    const invoice = Invoice.create({
      userId,
      lineItems: [{ description: "Test", quantity: 1, unitAmountCents: 2000 }],
    });
    const previousPayment = Payment.create({
      userId,
      invoiceId: invoice.id,
      amountCents: 1500,
      provider: "manual",
    });
    previousPayment.markSucceeded("previous");
    mockInvoiceRepo.findById.mockResolvedValue(invoice);
    mockPaymentRepo.findByInvoiceId.mockResolvedValue([previousPayment]);

    await expect(
      useCase.execute({
        invoiceId: invoice.id,
        amountCents: 600,
        currency: "usd",
        provider: "manual",
        metadata: {},
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it("should return an existing provider payment on callback retry", async () => {
    const invoice = Invoice.create({
      userId,
      lineItems: [{ description: "Test", quantity: 1, unitAmountCents: 2000 }],
    });
    const existingPayment = Payment.create({
      userId,
      invoiceId: invoice.id,
      amountCents: 2000,
      provider: "click",
      providerPaymentId: "click-1",
    });
    existingPayment.markSucceeded("click-1");
    mockInvoiceRepo.findById.mockResolvedValue(invoice);
    mockPaymentRepo.findByInvoiceId.mockResolvedValue([existingPayment]);

    const result = await useCase.execute({
      invoiceId: invoice.id,
      amountCents: 2000,
      currency: "usd",
      provider: "click",
      providerPaymentId: "click-1",
      metadata: {},
    });

    expect(result).toBe(existingPayment);
    expect(mockPaymentRepo.save).not.toHaveBeenCalled();
  });
});
