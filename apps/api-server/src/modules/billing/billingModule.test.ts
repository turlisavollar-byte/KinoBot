import { Router } from "express";
import { container } from "tsyringe";
import { BillingController, initBillingModule } from "./index";

describe("Billing module composition", () => {
  it("resolves the complete billing graph through the production DI container", () => {
    const router = Router();

    expect(() => initBillingModule(router)).not.toThrow();
    expect(container.resolve(BillingController)).toBeInstanceOf(
      BillingController,
    );
  });
});
