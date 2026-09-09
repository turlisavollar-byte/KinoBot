import { MarkInvoicePaidUseCase } from "./MarkInvoicePaidUseCase";
import { IInvoiceRepository, Invoice, IPaymentRepository } from "../domain";
import { NotFoundError, BusinessRuleError } from "../../../shared/errors";

describe("MarkInvoicePaidUseCase", () => {
  let useCase: MarkInvoicePaidUseCase;
  let mockRepo: jest.Mocked<IInvoiceRepository>;
  let mockPaymentRepo: jest.Mocked<IPaymentRepository>;

  const invoiceId = "123e4567-e89b-12d3-a456-426614174000";

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findBySubscriptionId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockPaymentRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByUserId: jest.fn(),
      findByInvoiceId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockPaymentRepo.save.mockImplementation(async (payment) => payment);
    useCase = new MarkInvoicePaidUseCase(mockRepo, mockPaymentRepo);
  });

  it("should mark an open invoice as paid", async () => {
    const invoice = Invoice.create({
      userId: "123e4567-e89b-12d3-a456-426614174001",
      lineItems: [{ description: "Test", quantity: 1, unitAmountCents: 100 }],
    });
    mockRepo.findById.mockResolvedValue(invoice);
    mockRepo.update.mockResolvedValue(invoice);

    await useCase.execute(invoice.id);

    expect(invoice.status).toBe("paid");
    expect(mockPaymentRepo.save).toHaveBeenCalledTimes(1);
    expect(mockRepo.update).toHaveBeenCalledTimes(1);
  });

  it("should throw NotFoundError if invoice does not exist", async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute(invoiceId)).rejects.toThrow(NotFoundError);
  });

  it("should throw BusinessRuleError if invoice is not open", async () => {
    const invoice = Invoice.create({
      userId: "123e4567-e89b-12d3-a456-426614174001",
      lineItems: [{ description: "Test", quantity: 1, unitAmountCents: 100 }],
    });
    invoice.void();
    mockRepo.findById.mockResolvedValue(invoice);

    await expect(useCase.execute(invoice.id)).rejects.toThrow(
      BusinessRuleError,
    );
  });
});
