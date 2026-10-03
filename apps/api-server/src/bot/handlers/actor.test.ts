import { describe, expect, it } from "vitest";
import { formatActorProfileText } from "./actor";

describe("bot actor profile formatting", () => {
  it("formats filmography, roles and codes while escaping HTML", () => {
    const text = formatActorProfileText(
      {
        name: "Actor <One>",
        biography: "Biography & story",
        birthDate: "1954-04-07",
        birthPlace: "Hong Kong",
      },
      [
        {
          movieId: "movie-id",
          title: "Film <Title>",
          releaseYear: 2010,
          role: "Lead & Hero",
          codes: [{ code: "AB23", status: "active" }],
        },
      ],
      true,
    );

    expect(text).toContain("Actor &lt;One&gt;");
    expect(text).toContain("Biography &amp; story");
    expect(text).toContain("Film &lt;Title&gt; (2010)");
    expect(text).toContain("Lead &amp; Hero");
    expect(text).toContain("<code>AB23</code>");
  });

  it("shows a localized empty-filmography message", () => {
    expect(
      formatActorProfileText(
        { name: "Actor", biography: null, birthDate: null, birthPlace: null },
        [],
        false,
      ),
    ).toContain("Фильмы пока не добавлены.");
  });
});