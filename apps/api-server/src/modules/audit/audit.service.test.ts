import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  dbMock,
  insertValuesMock,
  archiverDbMock,
  createDbClientMock,
  txMock,
  calls,
  archiveWhereMock,
  deleteWhereMock,
  archiveReturningMock,
  deleteReturningMock,
  archiverPoolEndMock,
} = vi.hoisted(() => {
  const calls: string[] = [];
  const archiveReturningMock = vi.fn();
  const archiveWhereMock = vi.fn(() => ({ returning: archiveReturningMock }));
  const archiveSetMock = vi.fn(() => ({ where: archiveWhereMock }));
  const updateMock = vi.fn(() => ({ set: archiveSetMock }));

  const deleteReturningMock = vi.fn();
  const deleteWhereMock = vi.fn(() => ({ returning: deleteReturningMock }));
  const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));

  const txMock = { update: updateMock, delete: deleteMock };
  const archiverDbMock = {
    transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) =>
      callback(txMock),
    ),
  };
  const archiverPoolEndMock = vi.fn().mockResolvedValue(undefined);
  const createDbClientMock = vi.fn(() => ({
    db: archiverDbMock,
    pool: { end: archiverPoolEndMock },
  }));

  return {
    dbMock: {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    insertValuesMock: vi.fn(),
    archiverDbMock,
    createDbClientMock,
    txMock,
    calls,
    archiveWhereMock,
    deleteWhereMock,
    archiveReturningMock,
    deleteReturningMock,
    archiverPoolEndMock,
  };
});

vi.mock("@workspace/db", () => ({
  db: dbMock,
  createDbClient: createDbClientMock,
  auditLogsTable: { id: "audit_logs.id", createdAt: "audit_logs.created_at", archivedAt: "audit_logs.archived_at" },
  auditLogTagsTable: {},
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    and: vi.fn((...conditions: unknown[]) => ({ operator: "and", conditions })),
    isNull: vi.fn((column: unknown) => ({ operator: "isNull", column })),
    lte: vi.fn((column: unknown, value: unknown) => ({
      operator: "lte",
      column,
      value,
    })),
  };
});

vi.mock("@/shared/utils/logger", () => ({
  Logger: class {
    debug = vi.fn();
    error = vi.fn();
    warn = vi.fn();
  },
}));

import {
  AuditError,
  AuditService,
  closeAuditArchiverPool,
  getRetentionCutoffs,
} from "./audit.service";

const originalEnv = { ...process.env };

describe("AuditService audit write controls", () => {
  const service = new AuditService();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "production";
    delete process.env.AUDIT_ENABLED;
    delete process.env.DISABLE_AUDIT_LOGS;
    delete process.env.AUDIT_LOGS_ENABLED;
    delete process.env.AUDIT_RETENTION_ENABLED;
    delete process.env.DATABASE_URL_ARCHIVER;
    calls.length = 0;

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

describe("AuditService retention", () => {
  const service = new AuditService();
  const now = new Date("2026-10-06T00:00:00.000Z");
  const policy = {
    retentionDays: 365,
    archiveAfterDays: 90,
    deleteAfterDays: 365,
    granularity: "daily" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(now);
    process.env.AUDIT_RETENTION_ENABLED = "true";
    process.env.DATABASE_URL_ARCHIVER = "postgresql://archiver:test@localhost/staging";
    archiveReturningMock.mockImplementation(async () => {
      calls.push("archive");
      return [{ id: "archive-id" }];
    });
    deleteReturningMock.mockImplementation(async () => {
      calls.push("delete");
      return [{ id: "delete-id" }];
    });
    archiverDbMock.transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => unknown) => callback(txMock),
    );
    createDbClientMock.mockReturnValue({
      db: archiverDbMock,
      pool: { end: archiverPoolEndMock },
    });
  });

  afterEach(async () => {
    await closeAuditArchiverPool();
    process.env = { ...originalEnv };
    vi.useRealTimers();
  });

  it("rejects retention when the feature flag is not enabled", async () => {
    process.env.AUDIT_RETENTION_ENABLED = "false";

    await expect(service.applyRetentionPolicy(policy)).rejects.toMatchObject<
      Partial<AuditError>
    >({ code: "RETENTION_DISABLED" });

    expect(createDbClientMock).not.toHaveBeenCalled();
    expect(archiverDbMock.transaction).not.toHaveBeenCalled();
  });

  it("archives before deleting within one archiver transaction", async () => {
    const result = await service.applyRetentionPolicy(policy);

    expect(result).toEqual({ archived: 1, deleted: 1 });
    expect(createDbClientMock).toHaveBeenCalledWith(
      process.env.DATABASE_URL_ARCHIVER,
      2,
    );
    expect(archiverDbMock.transaction).toHaveBeenCalledOnce();
    expect(calls).toEqual(["archive", "delete"]);

    const archiveCondition = archiveWhereMock.mock.calls[0]?.[0] as {
      conditions: Array<{ value?: Date }>;
    };
    const deleteCondition = deleteWhereMock.mock.calls[0]?.[0] as {
      value: Date;
    };
    expect(archiveCondition.conditions[0]?.value).toEqual(
      new Date("2026-07-08T00:00:00.000Z"),
    );
    expect(deleteCondition.value).toEqual(new Date("2025-10-06T00:00:00.000Z"));
  });

  it("does not use the application database for retention mutations", async () => {
    await service.applyRetentionPolicy(policy);

    expect(dbMock.update).not.toHaveBeenCalled();
    expect(dbMock.delete).not.toHaveBeenCalled();
    expect(txMock.update).toHaveBeenCalledOnce();
    expect(txMock.delete).toHaveBeenCalledOnce();
  });

  it("calculates cutoffs and rejects a delete period shorter than archive", () => {
    const cutoffs = getRetentionCutoffs(now, policy);

    expect(cutoffs.archiveDate.toISOString()).toBe("2026-07-08T00:00:00.000Z");
    expect(cutoffs.deleteDate.toISOString()).toBe("2025-10-06T00:00:00.000Z");
    expect(() =>
      getRetentionCutoffs(now, { ...policy, deleteAfterDays: 30 }),
    ).toThrow("deleteAfterDays must be an integer");
  });
});