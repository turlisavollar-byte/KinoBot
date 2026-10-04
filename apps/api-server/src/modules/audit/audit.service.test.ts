import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    insert: vi.fn(),
  },
}));

vi.mock("@workspace/db", () => ({
  db: dbMock,
  auditLogsTable: {},
  auditLogTagsTable: {},
}));

vi.mock("@/shared/utils/logger", () => ({
  Logger: class {
    debug = vi.fn();
    error = vi.fn();
    warn = vi.fn();
  },
}));

import { AuditService } from "./audit.service";

const originalEnv = { ...process.env };

describe("AuditService audit write controls", () => {
  const service = new AuditService();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "production";
    delete process.env.AUDIT_ENABLED;
    delete process.env.DISABLE_AUDIT_LOGS;
    delete process.env.AUDIT_LOGS_ENABLED;

    const createdAt = new Date("2026-10-04T00:00:00.000Z");
    dbMock.insert.mockReturnValue({
      values: () => ({
        returning: async () => [
          {
            id: "audit-production-test",
            actorType: "ADMIN",
            action: "LOGIN",
            targetType: "USER",
            metadata: { severity: "LOW" },
            createdAt,
          },
        ],
      }),
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("persists audit logs by default in production", async () => {
    const result = await service.log({
      actorType: "ADMIN",
      action: "LOGIN",
      targetType: "USER",
    });

    expect(dbMock.insert).toHaveBeenCalledOnce();
    expect(result.id).toBe("audit-production-test");
  });

  it("skips persistence when AUDIT_ENABLED is explicitly false", async () => {
    process.env.AUDIT_ENABLED = "false";

    const result = await service.log({
      actorType: "ADMIN",
      action: "LOGIN",
      targetType: "USER",
    });

    expect(dbMock.insert).not.toHaveBeenCalled();
    expect(result.id).toMatch(/^fallback_/);
  });

  it("continues to skip persistence in tests", async () => {
    process.env.NODE_ENV = "test";

    const result = await service.log({
      actorType: "ADMIN",
      action: "LOGIN",
      targetType: "USER",
    });

    expect(dbMock.insert).not.toHaveBeenCalled();
    expect(result.id).toMatch(/^fallback_/);
  });
});