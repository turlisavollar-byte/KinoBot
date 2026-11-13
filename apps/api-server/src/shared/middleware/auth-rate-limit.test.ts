import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { createAuthRateLimit } from "./auth-rate-limit";

class SharedRedisFake {
  readonly keys: string[] = [];
  private readonly counts = new Map<string, number>();

  async eval(
    _script: string,
    _numberOfKeys: number,
    key: string,
    _windowMs: number,
  ): Promise<unknown> {
    this.keys.push(key);
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    return [count, 60_000];
  }
}

async function invoke(
  middleware: ReturnType<typeof createAuthRateLimit>,
  email: string,
): Promise<
  { kind: "next" } | { kind: "response"; status: number; body: unknown }
> {
  return new Promise((resolve) => {
    const req = {
      ip: "127.0.0.1",
      body: { email },
      socket: { remoteAddress: "127.0.0.1" },
    } as Request;
    let statusCode = 200;
    const res = {
      setHeader: vi.fn(),
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: unknown) {
        resolve({ kind: "response", status: statusCode, body });
        return this;
      },
    } as unknown as Response;

    middleware(req, res, () => resolve({ kind: "next" }));
  });
}

describe("shared auth rate limiter", () => {
  it("shares Redis counters across middleware instances and does not store raw email", async () => {
    const redis = new SharedRedisFake();
    const first = createAuthRateLimit({
      maxRequests: 1,
      environment: "test",
      redis,
    });
    const second = createAuthRateLimit({
      maxRequests: 1,
      environment: "test",
      redis,
    });
    const email = `Customer-${randomUUID()}@example.com`;

    expect(await invoke(first, email)).toEqual({ kind: "next" });
    expect(await invoke(second, email)).toMatchObject({
      kind: "response",
      status: 429,
    });
    expect(redis.keys).toHaveLength(2);
    expect(redis.keys[0]).toBe(redis.keys[1]);
    expect(redis.keys[0]).not.toContain(email);
  });

  it("fails closed with 503 in production when Redis is unavailable", async () => {
    const limiter = createAuthRateLimit({
      environment: "production",
      redis: {
        eval: async () => {
          throw new Error("Redis unavailable");
        },
      },
      warn: vi.fn(),
    });

    expect(await invoke(limiter, "person@example.com")).toMatchObject({
      kind: "response",
      status: 503,
    });
  });

  it("fails closed while the production Redis connection is not ready", async () => {
    const evalRedis = vi.fn();
    const limiter = createAuthRateLimit({
      environment: "production",
      redis: {
        status: "connecting",
        eval: evalRedis,
      },
      warn: vi.fn(),
    });

    expect(await invoke(limiter, "person@example.com")).toMatchObject({
      kind: "response",
      status: 503,
    });
    expect(evalRedis).not.toHaveBeenCalled();
  });

  it("uses a warned in-process fallback outside production when Redis is absent", async () => {
    const warn = vi.fn();
    const limiter = createAuthRateLimit({
      maxRequests: 1,
      environment: "test",
      redis: null,
      warn,
    });
    const email = `fallback-${randomUUID()}@example.com`;

    expect(await invoke(limiter, email)).toEqual({ kind: "next" });
    expect(await invoke(limiter, email)).toMatchObject({
      kind: "response",
      status: 429,
    });
    expect(warn).toHaveBeenCalledWith(
      "Auth rate limiter is using process-local storage",
    );
  });
});
