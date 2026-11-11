import "reflect-metadata";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authenticated: true,
  userId: "user-1",
  role: "user",
  permissions: [] as string[],
  logAuditEvent: vi.fn(),
}));

vi.mock("@/shared/middleware", () => ({
  requireAuth: (req: any, res: any, next: () => void) => {
    if (!state.authenticated) {
      res.status(401).json({ success: false });
      return;
    }
    req.user = {
      id: state.userId,
      role: state.role,
      permissions: state.permissions,
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
  validate:
    (schemas: Record<string, { safeParse: (input: unknown) => any }>) =>
    (req: any, res: any, next: (error?: unknown) => void) => {
      for (const [target, schema] of Object.entries(schemas)) {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
          res.status(400).json({ success: false, error: result.error.message });
          return;
        }
        req[target] = result.data;
      }
      next();
    },
}));

vi.mock("@/shared/utils/audit", () => ({
  logAuditEvent: state.logAuditEvent,
}));

import { BillingController } from "./BillingController";
import { createBillingRouter } from "./billingRoutes";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const planId = "33333333-3333-4333-8333-333333333333";
const subscriptionId = "44444444-4444-4444-8444-444444444444";
const invoiceId = "55555555-5555-4555-8555-555555555555";

function makeController() {
  const controller = Object.create(BillingController.prototype) as any;
  controller.createPlanUC = {
    execute: vi.fn(async (dto: unknown) => ({
      id: planId,
      name: (dto as { name: string }).name,
      description: "plan description",
      priceCents: 500,
      currency: "USD",
      interval: "monthly",
      isActive: true,
      metadata: {},
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    })),
  };
  controller.getPlanUC = {
    execute: vi.fn(async (id: string) => ({
      id,
      name: "Plan",
      description: "plan description",
      priceCents: 500,
      currency: "USD",
      interval: "monthly",
      isActive: true,
      metadata: {},
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    })),
  };
  controller.updatePlanUC = {
    execute: vi.fn(async (id: string, data: { name?: string }) => ({
      id,
      name: data.name ?? "Plan",
      description: "plan description",
      priceCents: 500,
      currency: "USD",
      interval: "monthly",
      isActive: true,
      metadata: {},
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    })),
  };
  controller.deletePlanUC = { execute: vi.fn().mockResolvedValue(undefined) };
  controller.createSubUC = {
    execute: vi.fn(async (data: { userId: string; planId: string }) => ({
      id: subscriptionId,
      userId: data.userId,
      planId: data.planId,
      status: "active",
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      canceledAt: null,
    })),
  };
  controller.getSubUC = {
    execute: vi.fn(async () => ({
      id: subscriptionId,
      userId: userId,
      planId,
      status: "active",
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
    })),
  };
  controller.cancelSubUC = { execute: vi.fn().mockResolvedValue(undefined) };
  controller.createInvoiceUC = {
    execute: vi.fn(async (data: { userId: string }) => ({
      id: invoiceId,
      userId: data.userId,
      status: "pending",
    })),
  };
  controller.planRepo = { findById: vi.fn(async () => ({ name: "Plan" })) };
  controller.subResponse = vi.fn(async (sub: unknown) => sub);
  controller.invoiceResponse = vi.fn((invoice: unknown) => invoice);
  return controller;
}

describe("billing routes security and audit", () => {
  const servers: Server[] = [];
  let controller: ReturnType<typeof makeController>;

  beforeEach(() => {
    state.authenticated = true;
    state.userId = userId;
    state.role = "user";
    state.permissions = [];
    state.logAuditEvent.mockReset().mockResolvedValue({
      success: true,
      logId: "audit-1",
    });
    controller = makeController();
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
    app.use(createBillingRouter(controller as unknown as BillingController));
    app.use(
      (
        error: { statusCode?: number; message?: string },
        _req: unknown,
        res: any,
        _next: unknown,
      ) => {
        res
          .status(error.statusCode ?? 500)
          .json({ success: false, error: error.message });
      },
    );
    const server = app.listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  it("creates a subscription only for the authenticated customer", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/subscriptions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: otherUserId, planId }),
    });

    expect(response.status).toBe(201);
    expect(controller.createSubUC.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId, planId }),
    );
  });

  it("creates an invoice only for the authenticated customer", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/invoices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: otherUserId,
        lineItems: [
          { description: "Monthly access", quantity: 1, unitAmountCents: 500 },
        ],
      }),
    });

    expect(response.status).toBe(201);
    expect(controller.createInvoiceUC.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId }),
      undefined,
    );
  });

  it("allows a customer to cancel their own subscription and audits it", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(
      `${baseUrl}/subscriptions/${subscriptionId}/cancel`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ immediate: true }),
      },
    );

    expect(response.status).toBe(200);
    expect(controller.cancelSubUC.execute).toHaveBeenCalledWith({
      id: subscriptionId,
      immediate: true,
    });
    expect(state.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SUBSCRIPTION_CANCELLED",
        targetId: subscriptionId,
      }),
    );
  });

  it("forbids a customer from canceling another user's subscription", async () => {
    controller.getSubUC.execute.mockResolvedValueOnce({
      id: subscriptionId,
      userId: otherUserId,
      planId,
      status: "active",
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
    });
    const baseUrl = await createTestServer();
    const response = await fetch(
      `${baseUrl}/subscriptions/${subscriptionId}/cancel`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ immediate: true }),
      },
    );

    expect(response.status).toBe(403);
    expect(controller.cancelSubUC.execute).not.toHaveBeenCalled();
  });

  it("allows plan creation with MANAGE_SUBSCRIPTIONS and audits it", async () => {
    state.role = "manager";
    state.permissions = ["manage:subscriptions"];
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/plans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Monthly",
        priceCents: 500,
        interval: "monthly",
      }),
    });

    expect(response.status).toBe(201);
    expect(state.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CONFIG_CHANGED", targetId: planId }),
    );
  });

  it("denies plan creation without MANAGE_SUBSCRIPTIONS", async () => {
    state.permissions = ["refund:payments"];
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/plans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Monthly",
        priceCents: 500,
        interval: "monthly",
      }),
    });

    expect(response.status).toBe(403);
    expect(controller.createPlanUC.execute).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated customer checkout", async () => {
    state.authenticated = false;
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/subscriptions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, planId }),
    });

    expect(response.status).toBe(401);
  });

  it("audits plan update/delete and administrative subscription create/revoke", async () => {
    state.role = "admin";
    state.permissions = ["manage:subscriptions", "refund:payments"];
    const baseUrl = await createTestServer();

    const updateResponse = await fetch(`${baseUrl}/plans/${planId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    const deleteResponse = await fetch(`${baseUrl}/plans/${planId}`, {
      method: "DELETE",
    });
    const createSubResponse = await fetch(
      `${baseUrl}/subscriptions/admin/create`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: otherUserId, planId }),
      },
    );
    const deleteSubResponse = await fetch(
      `${baseUrl}/subscriptions/${subscriptionId}`,
      {
        method: "DELETE",
      },
    );

    expect(updateResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(204);
    expect(createSubResponse.status).toBe(201);
    expect(deleteSubResponse.status).toBe(204);
    expect(
      state.logAuditEvent.mock.calls.map(([event]) => event.action),
    ).toEqual(
      expect.arrayContaining([
        "CONFIG_CHANGED",
        "SUBSCRIPTION_CREATED",
        "SUBSCRIPTION_CANCELLED",
      ]),
    );
  });
});
