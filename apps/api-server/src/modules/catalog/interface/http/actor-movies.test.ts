import { describe, expect, it } from "vitest";
import {
  AttachActorToMovieBody,
  AttachActorToMovieParams,
  DetachActorFromMovieParams,
  UpdateActorMovieRoleBody,
  UpdateActorMovieRoleParams,
} from "@workspace/api-zod";

describe("actor filmography API contracts", () => {
  it("accepts UUID string identifiers and an optional nullable role", () => {
    expect(
      AttachActorToMovieParams.safeParse({ id: "actor-uuid" }).success,
    ).toBe(true);
    expect(
      AttachActorToMovieBody.safeParse({
        movieId: "movie-uuid",
        role: "Lead role",
      }).success,
    ).toBe(true);
    expect(
      AttachActorToMovieBody.safeParse({ movieId: "movie-uuid", role: null })
        .success,
    ).toBe(true);
  });

  it("rejects missing movie ids and role names longer than 255 characters", () => {
    expect(AttachActorToMovieBody.safeParse({ role: "Role" }).success).toBe(
      false,
    );
    expect(
      UpdateActorMovieRoleBody.safeParse({ role: "r".repeat(256) }).success,
    ).toBe(false);
  });

  it("validates relation path parameters for update and detach", () => {
    const params = { id: "actor-uuid", movieId: "movie-uuid" };
    expect(UpdateActorMovieRoleParams.safeParse(params).success).toBe(true);
    expect(DetachActorFromMovieParams.safeParse(params).success).toBe(true);
  });
});