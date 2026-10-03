import { describe, expect, it } from "vitest";
import { ValidationError } from "@/shared/errors/AppError";
import { resolveBroadcastAudience } from "./broadcast-audience";

describe("resolveBroadcastAudience", () => {
  it("targets one or more selected Telegram user IDs", () => {
    expect(resolveBroadcastAudience("users", [" 123456 "])).toEqual({
      recipientType: "users",
      recipients: ["123456"],
      targetAudience: '["123456"]',
    });
  });

  it("normalizes and de-duplicates user IDs", () => {
    expect(resolveBroadcastAudience("users", ["123", " 123 ", "456"]).recipients).toEqual([
      "123",
      "456",
    ]);
  });

  it("rejects an empty selected-user audience instead of broadcasting to all", () => {
    expect(() => resolveBroadcastAudience("users", [])).toThrow(ValidationError);
  });

  it("uses the all sentinel only for the explicit all_users recipient type", () => {
    expect(resolveBroadcastAudience("all_users", [])).toEqual({
      recipientType: "all_users",
      recipients: [],
      targetAudience: "all",
    });
  });

  it("requires at least one channel for a channel broadcast", () => {
    expect(() => resolveBroadcastAudience("channels", [])).toThrow(ValidationError);
    expect(resolveBroadcastAudience("channels", ["@kino", "@kino"]).targetAudience).toBe(
      '{"type":"channels","ids":["@kino"]}',
    );
  });
});
