import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, loggerMock, auditLogMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  loggerMock: {
    info: vi.fn(),
    error: vi.fn(),
  },
  auditLogMock: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: dbMock,
  systemSettingsTable: { key: "key", value: "value", updatedAt: "updated_at" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((column, value) => ({ column, value })),
}));

vi.mock("@/shared/utils/logger", () => ({
  Logger: { getInstance: () => loggerMock },
}));

vi.mock("@/shared/utils/audit", () => ({
  logAuditEvent: auditLogMock,
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePermission: () =>
    (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("@/shared/middleware", () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import * as settingsService from "./settings.service";
import {
  getTrialDurationDays,
  setTrialDurationDays,
} from "./settings.service";
import { updateTrialDurationWithAudit } from "./settings.routes";

let testClock = new Date("2026-01-01T00:00:00.000Z").getTime();

function mockSelect(limit: ReturnType<typeof vi.fn>) {
  dbMock.select.mockImplementation(() => ({
    from: () => ({ where: () => ({ limit }) }),
  }));
}

describe("settings service trial duration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    testClock += 5 * 60 * 1000;
    vi.setSystemTime(testClock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("falls back to 30 days when the database read fails", async () => {
    mockSelect(vi.fn().mockRejectedValue(new Error("database unavailable")));

    await expect(getTrialDurationDays()).resolves.toBe(30);
    expect(loggerMock.error).toHaveBeenCalledWith(
      "Failed to read trial duration",
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it("falls back to 30 days for an invalid stored value", async () => {
    mockSelect(vi.fn().mockResolvedValue([{ value: "366" }]));

    await expect(getTrialDurationDays()).resolves.toBe(30);
  });

  it("persists a valid duration and logs the update", async () => {
    const conflictUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({
      onConflictDoUpdate: conflictUpdate,
    });
    dbMock.insert.mockReturnValue({ values });

    await expect(setTrialDurationDays(14)).resolves.toBe(14);

    expect(values).toHaveBeenCalledWith({
      key: "trial_duration_days",
      value: "14",
    });
    expect(conflictUpdate).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith(
      "Trial duration updated",
      { value: 14 },
    );
  });

  it("uses the cached duration without a second database read", async () => {
    const limit = vi.fn().mockResolvedValue([{ value: "21" }]);
    mockSelect(limit);

    await expect(getTrialDurationDays()).resolves.toBe(21);
    await expect(getTrialDurationDays()).resolves.toBe(21);

    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });

  it("invalidates the cached duration after a successful update", async () => {
    const limit = vi
      .fn()
      .mockResolvedValueOnce([{ value: "21" }])
      .mockResolvedValueOnce([{ value: "9" }]);
    mockSelect(limit);
    dbMock.insert.mockReturnValue({
      values: () => ({ onConflictDoUpdate: vi.fn().mockResolvedValue(undefined) }),
    });

    await expect(getTrialDurationDays()).resolves.toBe(21);
    await setTrialDurationDays(9);
    await expect(getTrialDurationDays()).resolves.toBe(9);

    expect(dbMock.select).toHaveBeenCalledTimes(2);
  });

  it("audits trial setting updates with old/new JSON values and request actor context", async () => {
    vi.spyOn(settingsService, "getTrialDurationDays").mockResolvedValue(30);
    vi.spyOn(settingsService, "setTrialDurationDays").mockResolvedValue(14);
    auditLogMock.mockResolvedValue({
      logId: "audit-1",
      success: true,
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
    });
    const req = { user: { id: "admin-1", role: "admin" } } as any;

    await expect(updateTrialDurationWithAudit(req, 14)).resolves.toBe(14);

    expect(auditLogMock).toHaveBeenCalledWith({
      action: "CONFIG_CHANGED",
      targetType: "CONFIG",
      targetId: "trial_duration_days",
      targetName: "Trial duration",
      oldValue: { trial_duration_days: 30 },
      newValue: { trial_duration_days: 14 },
      req,
    });
  });

  it("keeps the setting update successful when audit logging reports failure", async () => {
    vi.spyOn(settingsService, "getTrialDurationDays").mockResolvedValue(30);
    vi.spyOn(settingsService, "setTrialDurationDays").mockResolvedValue(14);
    auditLogMock.mockResolvedValue({
      logId: "",
      success: false,
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
    });

    await expect(
      updateTrialDurationWithAudit({} as any, 14),
    ).resolves.toBe(14);
    expect(loggerMock.error).toHaveBeenCalledWith(
      "Failed to write audit log for trial duration change",
      { logId: "" },
    );
  });
});
