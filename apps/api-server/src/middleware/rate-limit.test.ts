import { once } from "node:events";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { createAdminRateLimit } from "./rate-limit";

describe("createAdminRateLimit", () => {
  let server: ReturnType<ReturnType<typeof express>['listen']> | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("allows five admin creation requests and returns the required 429 response on the sixth", async () => {
    const app = express();
    app.use(express.json(), createAdminRateLimit);
    app.post("/admin/users", (_req, res) => res.sendStatus(201));

    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address() as AddressInfo;
    const endpoint = `http://127.0.0.1:${address.port}/admin/users`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await fetch(endpoint, { method: "POST" });
      expect(response.status).toBe(201);
    }

    const limitedResponse = await fetch(endpoint, { method: "POST" });
    expect(limitedResponse.status).toBe(429);
    await expect(limitedResponse.json()).resolves.toEqual({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many admin creation attempts",
      },
    });
  });
});
