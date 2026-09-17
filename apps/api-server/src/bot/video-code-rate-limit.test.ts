import { describe, expect, it } from "vitest";
import { checkVideoCodeRateLimit } from "./video-code-rate-limit";

describe("video code rate limiter", () => {
  it("allows five attempts and blocks the sixth in memory fallback", async () => {
    const telegramId = `rate-limit-test-${crypto.randomUUID()}`;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await checkVideoCodeRateLimit(telegramId);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - attempt);
    }

    const blocked = await checkVideoCodeRateLimit(telegramId);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
