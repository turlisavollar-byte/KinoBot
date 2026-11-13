import { describe, expect, it } from "vitest";
import { canAuthenticateCustomer } from "./customer-auth-state";

describe("customer authentication lifecycle", () => {
  it("rejects suspended status even when legacy active flags remain set", () => {
    expect(
      canAuthenticateCustomer({
        status: "suspended",
        isActive: true,
        isBlocked: false,
        deletedAt: null,
      }),
    ).toBe(false);
  });

  it("requires active status and consistent legacy flags", () => {
    expect(
      canAuthenticateCustomer({
        status: "active",
        isActive: true,
        isBlocked: false,
        deletedAt: null,
      }),
    ).toBe(true);
    expect(
      canAuthenticateCustomer({
        status: "active",
        isActive: false,
        isBlocked: false,
        deletedAt: null,
      }),
    ).toBe(false);
    expect(
      canAuthenticateCustomer({
        status: "active",
        isActive: true,
        isBlocked: false,
        deletedAt: new Date(),
      }),
    ).toBe(false);
  });
});
