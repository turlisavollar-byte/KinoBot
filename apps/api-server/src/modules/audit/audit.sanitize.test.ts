import { describe, expect, it } from "vitest";
import { sanitizeAuditPayload } from "./audit.sanitize";

describe("sanitizeAuditPayload", () => {
  it("redacts all approved sensitive key patterns", () => {
    const keys = [
      "password",
      "passwd",
      "pwd",
      "passphrase",
      "token",
      "authorization",
      "cookie",
      "secret",
      "api_key",
      "private-key",
      "credential",
      "sessionId",
      "signingKey",
      "jwt",
      "bearer",
      "csrf",
      "xsrf",
      "signature",
      "encryptionKey",
      "auth",
    ];
    const input = Object.fromEntries(keys.map((key) => [key, "secret-value"]));
    const result = sanitizeAuditPayload(input) as Record<string, unknown>;

    for (const key of keys) {
      expect(result[key]).toBe("[REDACTED]");
    }
  });

  it("redacts secrets in nested objects", () => {
    expect(
      sanitizeAuditPayload({
        profile: { account: { settings: { password: "secret" } } },
      }),
    ).toEqual({
      profile: { account: { settings: { password: "[REDACTED]" } } },
    });
  });

  it("redacts authorization headers regardless of case", () => {
    expect(
      sanitizeAuditPayload({
        headers: {
          Authorization: "Bearer access-token",
          "Proxy-Authorization": "Basic credentials",
          "Content-Type": "application/json",
        },
      }),
    ).toEqual({
      headers: {
        Authorization: "[REDACTED]",
        "Proxy-Authorization": "[REDACTED]",
        "Content-Type": "application/json",
      },
    });
  });

  it("redacts cookie and set-cookie values", () => {
    expect(
      sanitizeAuditPayload({
        Cookie: "session=secret",
        "Set-Cookie": "session=secret; HttpOnly",
      }),
    ).toEqual({
      Cookie: "[REDACTED]",
      "Set-Cookie": "[REDACTED]",
    });
  });

  it("recurses into objects nested inside arrays", () => {
    expect(
      sanitizeAuditPayload([
        { password: "one" },
        [{ nested: { refresh_token: "two" } }],
      ]),
    ).toEqual([
      { password: "[REDACTED]" },
      [{ nested: { refresh_token: "[REDACTED]" } }],
    ]);
  });

  it("normalizes key case and separators", () => {
    expect(
      sanitizeAuditPayload({
        Refresh_Token: "one",
        clientSecret: "two",
        APIKEY: "three",
      }),
    ).toEqual({
      Refresh_Token: "[REDACTED]",
      clientSecret: "[REDACTED]",
      APIKEY: "[REDACTED]",
    });
  });

  it("preserves null, undefined, and ordinary primitive values", () => {
    expect(
      sanitizeAuditPayload({
        nullValue: null,
        undefinedValue: undefined,
        count: 3,
        active: true,
      }),
    ).toEqual({
      nullValue: null,
      undefinedValue: undefined,
      count: 3,
      active: true,
    });
  });

  it("does not mutate the input", () => {
    const input = { nested: { password: "original" } };

    sanitizeAuditPayload(input);

    expect(input.nested.password).toBe("original");
  });

  it("handles circular references", () => {
    const input: Record<string, unknown> = {};
    input.self = input;

    expect(sanitizeAuditPayload(input)).toEqual({ self: "[Circular]" });
  });
});