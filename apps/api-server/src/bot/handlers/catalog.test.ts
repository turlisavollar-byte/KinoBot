import { describe, expect, it } from "vitest";
import {
  channelLink,
  formatMovieCast,
  isDifferentUtcMonth,
  isDifferentUtcWeek,
  requiredChannelKeyboard,
} from "./catalog";

describe("movie cast captions", () => {
  it("formats localized cast roles and escapes actor-provided HTML", () => {
    expect(
      formatMovieCast(
        [{ actorId: "actor-id", name: "Actor <One>", role: "Lead & Hero" }],
        true,
      ),
    ).toContain("Actor &lt;One&gt; — Lead &amp; Hero");
  });

  it("omits cast metadata when a movie has no actor relations", () => {
    expect(formatMovieCast([], false)).toBe("");
  });
});

describe("UTC code limit reset bucketing", () => {
  it("keeps the same ISO week in the same reset bucket", () => {
    expect(
      isDifferentUtcWeek(
        new Date("2026-09-13T12:00:00Z"),
        new Date("2026-09-12T18:00:00Z"),
      ),
    ).toBe(false);
  });

  it("resets when the UTC calendar week changes", () => {
    expect(
      isDifferentUtcWeek(
        new Date("2026-09-14T02:00:00Z"),
        new Date("2026-09-13T20:00:00Z"),
      ),
    ).toBe(true);
  });

  it("resets when the UTC month changes even within a short span", () => {
    expect(
      isDifferentUtcMonth(
        new Date("2026-09-01T00:30:00Z"),
        new Date("2026-08-31T23:50:00Z"),
      ),
    ).toBe(true);
  });
});

describe("required channel keyboard", () => {
  it("builds join links and recheck action from configured channel IDs", () => {
    const keyboard = requiredChannelKeyboard(
      "channels:recheck",
      ["@shorts_channel", "-1001234567890"],
      true,
    );

    expect(keyboard.inline_keyboard).toEqual([
      [{ text: "📢 1-kanalga o'tish", url: "https://t.me/shorts_channel" }],
      [{ text: "📢 2-kanalga o'tish", url: "https://t.me/c/1234567890" }],
      [
        {
          text: "✅ Obuna bo'ldim — tekshirish",
          callback_data: "channels:recheck",
        },
      ],
    ]);
  });

  it("uses the configured public channel username for join links", () => {
    expect(channelLink("@Shorts_Channel")).toBe(
      "https://t.me/Shorts_Channel",
    );
  });
});
