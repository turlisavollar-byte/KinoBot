import { describe, expect, it, vi } from "vitest";
import { getUserAuditHistory, USER_AUDIT_HISTORY_LIMIT } from "./user-audit-history";

describe("getUserAuditHistory", () => {
  it("requests and returns no more than ten whitelisted audit fields", async () => {
    const logs = Array.from({ length: 12 }, (_, index) => ({
      id: `log-${index}`,
      action: "UPDATE" as const,
      actorId: "admin-1",
      actorType: "ADMIN" as const,
      targetType: "USER" as const,
      targetId: "user-1",
      createdAt: new Date("2026-10-06T00:00:00.000Z"),
      severity: "LOW" as const,
      metadata: { password: "never-return" },
      oldValue: { token: "never-return" },
      newValue: { cookie: "never-return" },
    }));
    const service = { getUserTrail: vi.fn().mockResolvedValue(logs) };

    const result = await getUserAuditHistory(service as any, "user-1");

    expect(USER_AUDIT_HISTORY_LIMIT).toBe(10);
    expect(service.getUserTrail).toHaveBeenCalledWith("user-1", 10);
    expect(result).toHaveLength(10);
    expect(result[0]).not.toHaveProperty("metadata");
    expect(result[0]).not.toHaveProperty("oldValue");
    expect(result[0]).not.toHaveProperty("newValue");
  });
});