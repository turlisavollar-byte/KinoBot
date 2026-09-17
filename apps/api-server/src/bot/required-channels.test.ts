import { describe, expect, it } from "vitest";
import {
  parseRequiredChannelIds,
  safeParseRequiredChannelIds,
  serializeRequiredChannelIds,
} from "./required-channels";

describe("required channel identifiers", () => {
  it("trims, canonicalizes usernames, and removes duplicates", () => {
    expect(
      parseRequiredChannelIds(" @CinemaHub, @cinemahub, -1001234567890 "),
    ).toEqual(["@cinemahub", "-1001234567890"]);
  });

  it("returns null when serializing an empty value", () => {
    expect(serializeRequiredChannelIds(" , ")).toBeNull();
  });

  it("rejects invalid identifiers", () => {
    expect(() => parseRequiredChannelIds("cinema, @ok")).toThrow(
      "Invalid required channel identifier: cinema",
    );
  });

  it("accepts newline and semicolon separators", () => {
    expect(parseRequiredChannelIds("@alpha1;\n@beta1, -1001234567890")).toEqual(
      ["@alpha1", "@beta1", "-1001234567890"],
    );
  });

  it("skips invalid runtime values without throwing", () => {
    expect(safeParseRequiredChannelIds("@alpha1, invalid, @ALPHA1")).toEqual([
      "@alpha1",
    ]);
    expect(safeParseRequiredChannelIds(-1001234567890)).toEqual([
      "-1001234567890",
    ]);
  });
});
