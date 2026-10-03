import { describe, expect, it, vi } from "vitest";

vi.mock("@/bot/handlers/catalog", () => ({
  deliverVideoCodeByDeeplink: vi.fn(),
}));
vi.mock("@/bot/handlers/actor", () => ({
  sendActorProfile: vi.fn(),
}));

import { parseDeeplinkPayload } from "./start";

describe("Telegram start deep links", () => {
  it("parses actor UUID payloads independently from campaign codes", () => {
    expect(
      parseDeeplinkPayload("actor_123e4567-e89b-12d3-a456-426614174000"),
    ).toEqual({
      source: null,
      code: null,
      actorId: "123e4567-e89b-12d3-a456-426614174000",
    });
  });

  it("preserves Instagram video-code deep links", () => {
    expect(parseDeeplinkPayload("ig_AB23")).toEqual({
      source: "instagram",
      code: "AB23",
      actorId: null,
    });
  });

  it("ignores malformed actor payloads", () => {
    expect(parseDeeplinkPayload("actor_not-a-uuid")).toEqual({
      source: null,
      code: null,
      actorId: null,
    });
  });
});