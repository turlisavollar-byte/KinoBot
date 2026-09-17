import { Router } from "express";
import { container } from "tsyringe";
import { BillingController, initBillingModule } from "./index";
import { pickCanonicalSubscriptionSource } from "./infrastructure/subscriptionCompatibility";

describe("Billing module composition", () => {
  it("resolves the complete billing graph through the production DI container", () => {
    const router = Router();

    expect(() => initBillingModule(router)).not.toThrow();
    expect(container.resolve(BillingController)).toBeInstanceOf(
      BillingController,
    );
  });

  it("prefers the canonical billing subscription model when both tables are present", () => {
    const result = pickCanonicalSubscriptionSource(
      {
        id: "billing-1",
        userId: "user-1",
        planId: "plan-1",
        status: "active",
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        endDate: new Date("2025-02-01T00:00:00.000Z"),
        source: "billing",
        table: "billing_subscriptions",
      },
      {
        id: "legacy-1",
        userId: "user-1",
        planId: "legacy-plan-1",
        status: "active",
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        endDate: new Date("2025-02-01T00:00:00.000Z"),
        source: "legacy",
        table: "subscriptions",
      },
    );

    expect(result?.source).toBe("billing");
    expect(result?.table).toBe("billing_subscriptions");
  });
});
