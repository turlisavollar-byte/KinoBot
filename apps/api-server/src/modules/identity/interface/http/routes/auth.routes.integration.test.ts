import "reflect-metadata";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { AuthController } from "../controllers/auth.controller";
import { createAuthRoutes } from "./auth.routes";

describe("identity auth HTTP routes", () => {
  const servers: Server[] = [];

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
    const controller = new AuthController(
      {
        execute: async () => ({
          user: { id: "u1" },
          accessToken: "a",
          refreshToken: "r",
          expiresIn: 3600,
        }),
      } as any,
      {} as any,
      {
        execute: async () => ({
          user: { id: "u1" },
          accessToken: "a2",
          refreshToken: "r2",
          expiresIn: 3600,
        }),
      } as any,
      {} as any,
      {
        execute: async () => ({
          user: {
            id: "u1",
            email: "person@example.com",
            name: "Person",
            role: "user",
            status: "active",
          },
        }),
      } as any,
    );
    const app = express();
    app.use(express.json());
    app.use(
      createAuthRoutes(controller, {
        requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
      } as any),
    );
    const server = app.listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it("serves login, registration, and refresh through the HTTP contract", async () => {
    const baseUrl = await createTestServer();
    const request = (path: string, body: Record<string, unknown>) =>
      fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

    const login = await request("/login", {
      email: "person@example.com",
      password: "StrongPassword1!",
    });
    expect(login.status).toBe(200);
    expect(await login.json()).toMatchObject({
      accessToken: "a",
      refreshToken: "r",
    });

    const register = await request("/register", {
      email: "new@example.com",
      name: "New",
      password: "StrongPassword1!",
    });
    expect(register.status).toBe(201);
    expect(await register.json()).toMatchObject({ user: { role: "user" } });

    const refresh = await request("/refresh", { refreshToken: "r" });
    expect(refresh.status).toBe(200);
    expect(await refresh.json()).toMatchObject({
      accessToken: "a2",
      refreshToken: "r2",
    });
  });
});
