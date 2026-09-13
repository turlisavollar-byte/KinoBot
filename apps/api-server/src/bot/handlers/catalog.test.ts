import { describe, expect, it } from "vitest";
import { isDifferentUtcWeek, isDifferentUtcMonth } from "./catalog";

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
