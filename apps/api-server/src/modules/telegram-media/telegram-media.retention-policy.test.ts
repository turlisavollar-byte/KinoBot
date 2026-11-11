import { describe, expect, it } from "vitest";
import {
  getTelegramMediaUrlLifetime,
  TELEGRAM_MEDIA_RETENTION_MS,
  TELEGRAM_MEDIA_SIGNED_URL_TTL_SECONDS,
} from "./telegram-media.retention-policy";

describe("Telegram media retention policy", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("caps signed playback URLs at one hour", () => {
    const uploadedAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    expect(getTelegramMediaUrlLifetime(uploadedAt, now)).toBe(
      TELEGRAM_MEDIA_SIGNED_URL_TTL_SECONDS,
    );
  });

  it("does not issue URLs beyond the 90-day retention deadline", () => {
    const uploadedAt = new Date(now.getTime() - TELEGRAM_MEDIA_RETENTION_MS + 30_000);
    expect(getTelegramMediaUrlLifetime(uploadedAt, now)).toBe(30);
  });

  it("rejects expired media", () => {
    const uploadedAt = new Date(now.getTime() - TELEGRAM_MEDIA_RETENTION_MS - 1);
    expect(getTelegramMediaUrlLifetime(uploadedAt, now)).toBeNull();
  });
});
