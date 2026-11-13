import { describe, expect, it, vi } from "vitest";
import {
  writeCustomerIdentityAudit,
  type CustomerIdentityAuditAction,
} from "./customer-identity-audit";

describe("customer identity audit events", () => {
  it.each(["REGISTER", "LOGIN", "LOGIN_FAILED", "LINK", "LOGOUT"] as const)(
    "writes a sanitized %s event",
    async (action: CustomerIdentityAuditAction) => {
      const writer = { log: vi.fn().mockResolvedValue(undefined) };

      await writeCustomerIdentityAudit(writer, {
        action,
        userId: "customer-1",
        sessionId: "session-1",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      });

      expect(writer.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
          actorId: "customer-1",
          actorType: "USER",
          targetType: "USER",
          targetId: "customer-1",
          sessionId: "session-1",
          metadata: { channel: "web_customer_identity" },
        }),
      );
      expect(JSON.stringify(writer.log.mock.calls[0][0])).not.toContain(
        "email",
      );
      expect(JSON.stringify(writer.log.mock.calls[0][0])).not.toContain(
        "password",
      );
    },
  );
});
