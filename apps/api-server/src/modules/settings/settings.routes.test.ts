import "reflect-metadata";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticated: true,
  canManageSystem: true,
  getSettings: vi.fn(),
  getTrialDurationDays: vi.fn(),
  resetAllTrials: vi.fn(),
  setTrialDurationDays: vi.fn(),
  logAuditEvent: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: (req: any, res: any, next: () => void) => {
    if (!mocks.authenticated) {
      res.status(401).json({ success: false });
      return;
    }
    req.user = {
      id: "admin-1",
      role: "admin",
      permissions: mocks.canManageSystem ? ["manage:security"] : [],
    };
    next();
  },
  requirePermission:
    (permission: string) => (req: any, res: any, next: () => void) => {
      if (!req.user?.permissions?.includes(permission)) {
        res.status(403).json({ success: false });
        return;
      }
      next();
    },
}));

vi.mock("@/modules/settings/settings.service", () => ({
  getSettings: mocks.getSettings,
  getTrialDurationDays: mocks.getTrialDurationDays,
  resetAllTrials: mocks.resetAllTrials,
  setTrialDurationDays: mocks.setTrialDurationDays,
}));

vi.mock("@/shared/utils/audit", () => ({
  logAuditEvent: mocks.logAuditEvent,
}));

import settingsRouter from "./settings.routes";

describe("settings HTTP routes", () => {
  const servers: Server[] = [];

  beforeEach(() => {
    mocks.authenticated = true;
    mocks.canManageSystem = true;
    mocks.getSettings
      .mockReset()
      .mockResolvedValue({ trial_duration_days: 30 });
    mocks.getTrialDurationDays.mockReset().mockResolvedValue(30);
    mocks.resetAllTrials.mockReset().mockResolvedValue(0);
    mocks.setTrialDurationDays
      .mockReset()
      .mockImplementation(async (days: number) => days);
    mocks.logAuditEvent
      .mockReset()
      .mockResolvedValue({ success: true, logId: "audit-1" });
  });

  afterEach(async () => {
    await Promise.all(
      servers
        .splice(0)
        .map(
          (server) =>
            new Promise<void>((resolve, reject) =>
              server.close((error?: Error) =>
                error ? reject(error) : resolve(),
              ),
            ),
        ),
    );
  });

  async function createTestServer() {
    const app = express();
    app.use(express.json());
    app.use(settingsRouter);
    const server = app.listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it("returns settings for an authenticated manager", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/settings`);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { trial_duration_days: 30 },
    });
    expect(mocks.getSettings).toHaveBeenCalledOnce();
  });

  it("updates trial duration and writes an audit event", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/settings`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trial_duration_days: 14 }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { trial_duration_days: 14 },
    });
    expect(mocks.setTrialDurationDays).toHaveBeenCalledWith(14);
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CONFIG_CHANGED",
        targetId: "trial_duration_days",
        oldValue: { trial_duration_days: 30 },
        newValue: { trial_duration_days: 14 },
      }),
    );
  });

  it("rejects values outside the 0–365 integer range", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/settings`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trial_duration_days: 366 }),
    });

    expect(response.status).toBe(400);
    expect(mocks.setTrialDurationDays).not.toHaveBeenCalled();
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    mocks.authenticated = false;
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/settings`);

    expect(response.status).toBe(401);
  });

  it("requires MANAGE_SYSTEM permission", async () => {
    mocks.canManageSystem = false;
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/settings`);

    expect(response.status).toBe(403);
  });

  it("previews the number of users affected without auditing or updating", async () => {
    mocks.resetAllTrials.mockResolvedValue(12);
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/settings/reset-all-trials`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days: 30, onlyExpired: true, preview: true }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { affectedCount: 12, days: 30, onlyExpired: true, preview: true },
    });
    expect(mocks.resetAllTrials).toHaveBeenCalledWith(30, true, true);
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });

  it("applies the reset and audits the affected user count", async () => {
    mocks.resetAllTrials.mockResolvedValue(12);
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/settings/reset-all-trials`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days: 30, onlyExpired: true, preview: false }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { affectedCount: 12, days: 30, onlyExpired: true, preview: false },
    });
    expect(mocks.resetAllTrials).toHaveBeenCalledWith(30, true, false);
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TRIAL_RESET_ALL",
        targetType: "USER",
        targetId: "all",
        newValue: { days: 30, onlyExpired: true, affectedCount: 12 },
      }),
    );
  });

  it("requires MANAGE_SYSTEM permission to reset all trials", async () => {
    mocks.canManageSystem = false;
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/settings/reset-all-trials`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days: 30, onlyExpired: true, preview: false }),
    });

    expect(response.status).toBe(403);
    expect(mocks.resetAllTrials).not.toHaveBeenCalled();
  });

  it("rejects invalid reset days and boolean options", async () => {
    const baseUrl = await createTestServer();
    const invalidDays = await fetch(`${baseUrl}/settings/reset-all-trials`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days: 0, onlyExpired: true, preview: true }),
    });
    const invalidOption = await fetch(`${baseUrl}/settings/reset-all-trials`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days: 30, onlyExpired: "true", preview: true }),
    });

    expect(invalidDays.status).toBe(400);
    expect(invalidOption.status).toBe(400);
    expect(mocks.resetAllTrials).not.toHaveBeenCalled();
  });
});
