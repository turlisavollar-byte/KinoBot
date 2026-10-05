import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, insertValuesMock } = vi.hoisted(() => ({
  dbMock: {
    insert: vi.fn(),
  },
  insertValuesMock: vi.fn(),
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
    insertValuesMock.mockReturnValue({
        returning: async () => [
          {
            id: "audit-production-test",
            actorType: "ADMIN",
            action: "LOGIN",
            targetType: "USER",
            severity: "info",
            metadata: { severity: "LOW" },
            createdAt,
          },
        ],
    });
    dbMock.insert.mockReturnValue({ values: insertValuesMock });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("persists audit logs by default in production and keeps the legacy API severity", async () => {
    const result = await service.log({
      actorType: "ADMIN",
      action: "LOGIN",
      targetType: "USER",
      severity: "LOW",
    });

    expect(dbMock.insert).toHaveBeenCalledOnce();
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "info" }),
    );
    expect(result.id).toBe("audit-production-test");
    expect(result.severity).toBe("LOW");
  });

  it("stores warning severity using the new database enum", async () => {
    insertValuesMock.mockReturnValue({
      returning: async () => [
        {
          id: "audit-warning-test",
          actorType: "ADMIN",
          action: "UPDATE",
          targetType: "USER",
          severity: "warning",
          metadata: { severity: "MEDIUM" },
          createdAt: new Date("2026-10-04T00:00:00.000Z"),
        },
      ],
    });

    const result = await service.log({
      actorType: "ADMIN",
      action: "UPDATE",
      targetType: "USER",
      severity: "MEDIUM",
    });

    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "warning" }),
    );
    expect(result.severity).toBe("MEDIUM");
  });

  it("stores critical severity using the new database enum", async () => {
    const values = vi.fn().mockReturnValue({
      returning: async () => [
        {
          id: "audit-severity-test",
          actorType: "ADMIN",
          action: "DELETE",
          targetType: "USER",
          severity: "critical",
          metadata: { severity: "CRITICAL" },
          createdAt: new Date("2026-10-04T00:00:00.000Z"),
        },
      ],
    });
    dbMock.insert.mockReturnValue({ values });

    const result = await service.log({
      actorType: "ADMIN",
      action: "DELETE",
      targetType: "USER",
      severity: "CRITICAL",
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "critical" }),
    );
    expect(result.severity).toBe("CRITICAL");
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