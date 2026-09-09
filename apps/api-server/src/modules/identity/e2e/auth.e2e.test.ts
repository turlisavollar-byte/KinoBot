import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
const suite = e2eDatabaseUrl ? describe : describe.skip;

suite("identity auth end-to-end", () => {
  let app: typeof import("../../../app").default;
  let server: Server;
  let baseUrl: string;
  let email: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = e2eDatabaseUrl;
    const modules = await import("../../../app");
    app = modules.default;
    email = `e2e-${Date.now()}@example.com`;

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error?: Error) => (error ? reject(error) : resolve())),
    );
  });

  async function post(
    path: string,
    body: Record<string, unknown>,
    token?: string,
  ) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it("registers, logs in, refreshes, logs out, and rejects the revoked refresh token", async () => {
    const password = "StrongPassword1!";
    const register = await post("/api/identity/auth/register", {
      email,
      name: "E2E User",
      password,
    });
    expect(register.status).toBe(201);

    const login = await post("/api/identity/auth/login", { email, password });
    expect(login.status).toBe(200);
    const loginBody = (await login.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    expect(loginBody.accessToken).toBeTruthy();
    expect(loginBody.refreshToken).toBeTruthy();

    const refresh = await post("/api/identity/auth/refresh", {
      refreshToken: loginBody.refreshToken,
    });
    expect(refresh.status).toBe(200);
    const refreshBody = (await refresh.json()) as {
      accessToken: string;
      refreshToken: string;
    };

    const logout = await post(
      "/api/identity/auth/logout",
      { refreshToken: refreshBody.refreshToken },
      refreshBody.accessToken,
    );
    expect(logout.status).toBe(200);

    const revokedRefresh = await post("/api/identity/auth/refresh", {
      refreshToken: refreshBody.refreshToken,
    });
    expect(revokedRefresh.status).toBe(401);
  });
});
