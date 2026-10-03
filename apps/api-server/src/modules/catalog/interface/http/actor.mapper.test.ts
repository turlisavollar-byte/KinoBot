import { describe, expect, it } from "vitest";
import { toActorInsert, toActorResponse, toActorUpdate } from "./actor.mapper";

describe("actor API/database mapping", () => {
  it("maps the public bio field to the database biography column on create", () => {
    expect(
      toActorInsert({ name: "Test Actor", photoUrl: "https://example.test/photo.jpg", bio: "Biography" }),
    ).toEqual({
      name: "Test Actor",
      photoUrl: "https://example.test/photo.jpg",
      biography: "Biography",
    });
  });

  it("maps bio updates without clearing fields that were not provided", () => {
    expect(toActorUpdate({ bio: "Updated biography" })).toEqual({
      biography: "Updated biography",
    });
  });

  it("returns the database biography using the public bio field", () => {
    expect(
      toActorResponse({
        id: "actor-id",
        name: "Test Actor",
        photoUrl: "https://example.test/photo.jpg",
        biography: "Biography",
        birthDate: null,
        birthPlace: null,
        deletedAt: null,
      }),
    ).toEqual({
      id: "actor-id",
      name: "Test Actor",
      photoUrl: "https://example.test/photo.jpg",
      bio: "Biography",
    });
  });
});