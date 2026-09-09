import { createHash } from "node:crypto";
import {
  hasConfiguredSecret,
  isFreshWebhookTimestamp,
  safeSignatureEqual,
} from "./signature";
import { NBUService } from "./NBUService";
import { PaymeService } from "./PaymeService";

describe("billing provider signature security", () => {
  it("compares equal signatures without accepting empty values", () => {
    expect(safeSignatureEqual("abc", "abc")).toBe(true);
    expect(safeSignatureEqual("abc", "abd")).toBe(false);
    expect(safeSignatureEqual("", "")).toBe(false);
    expect(hasConfiguredSecret("  ")).toBe(false);
  });

  it("fails closed when NBU has no configured secret", () => {
    const service = new NBUService("merchant", "terminal", "");
    const webhook = {
      transactionId: "tx-1",
      orderId: "order-1",
      amount: 100,
      status: "paid" as const,
      timestamp: "2026-09-08T00:00:00.000Z",
      sign: createHash("sha256")
        .update("order-1tx-1100paid2026-09-08T00:00:00.000Z")
        .digest("hex"),
    };

    expect(service.verifySignature(webhook)).toBe(false);
  });

  it("fails closed when Payme has no configured secret", () => {
    const service = new PaymeService("merchant", "");
    const credentials = Buffer.from("Paycom:").toString("base64");

    expect(service.verifyAuth(`Basic ${credentials}`)).toBe(false);
  });

  it("enforces the replay window outside test mode", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const now = Date.parse("2026-09-08T12:00:00.000Z");
      expect(
        isFreshWebhookTimestamp("2026-09-08T11:58:00.000Z", now, 300),
      ).toBe(true);
      expect(
        isFreshWebhookTimestamp("2026-09-08T11:50:00.000Z", now, 300),
      ).toBe(false);
      expect(isFreshWebhookTimestamp("not-a-date", now, 300)).toBe(false);
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
