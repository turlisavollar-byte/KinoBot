import { CreateInvoiceUseCase } from "./CreateInvoiceUseCase";
import { IInvoiceRepository, Invoice, Subscription } from "../domain";
import type { ISubscriptionRepository } from "../domain";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";

describe("CreateInvoiceUseCase", () => {
  const userId = "123e4567-e89b-12d3-a456-426614174000";
  let repository: jest.Mocked<IInvoiceRepository>;
  let subscriptionRepository: jest.Mocked<ISubscriptionRepository>;
  let useCase: CreateInvoiceUseCase;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      findByUserId: jest.fn(),
      findBySubscriptionId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    subscriptionRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateInvoiceUseCase(repository, subscriptionRepository);
  });

  it("maps line items and persists the calculated invoice total", async () => {
    repository.save.mockImplementation(async (invoice) => invoice);

    const invoice = await useCase.execute({
      userId,
      lineItems: [{ description: "Plan", quantity: 2, unitAmountCents: 1500 }],
      currency: "USD",
      metadata: { source: "test" },
    });

    expect(invoice.amountCents).toBe(3000);
    expect(invoice.currency).toBe("usd");
    expect(invoice.lineItems).toEqual([
      { description: "Plan", quantity: 2, unitAmountCents: 1500 },
    ]);
    expect(repository.save).toHaveBeenCalledWith(invoice);
  });

  it("returns the existing invoice for a repeated idempotency key", async () => {
    const existing = Invoice.create({
      userId,
      lineItems: [{ description: "Plan", quantity: 1, unitAmountCents: 1500 }],
    });
    repository.findByIdempotencyKey.mockResolvedValue(existing);

    const result = await useCase.execute(
      {
        userId,
        lineItems: [
          {
            description: "Different retry body",
            quantity: 1,
            unitAmountCents: 1,
          },
        ],
      },
      "invoice-request-1",
    );

    expect(result).toBe(existing);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("rejects an invoice linked to another user's subscription", async () => {
    const subscription = Subscription.create({
      userId: "123e4567-e89b-12d3-a456-426614174001",
      planId: "123e4567-e89b-12d3-a456-426614174002",
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
    });
    subscriptionRepository.findById.mockResolvedValue(subscription);

    await expect(
      useCase.execute({
        userId,
        subscriptionId: subscription.id,
        lineItems: [
          { description: "Plan", quantity: 1, unitAmountCents: 1500 },
        ],
      }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it("rejects an invoice linked to a missing subscription", async () => {
    const subscriptionId = "123e4567-e89b-12d3-a456-426614174002";
    subscriptionRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId,
        subscriptionId,
        lineItems: [
          { description: "Plan", quantity: 1, unitAmountCents: 1500 },
        ],
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
