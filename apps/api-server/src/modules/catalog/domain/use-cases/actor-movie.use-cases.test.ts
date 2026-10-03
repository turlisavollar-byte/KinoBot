import { describe, expect, it, vi } from "vitest";
import type { ICatalogRepository } from "../repositories/catalog.repository.interface";
import { AttachActorToMovieUseCase } from "./attach-actor-to-movie.use-case";
import { ActorMovieRelationError } from "./actor-movie.errors";
import { DetachActorFromMovieUseCase } from "./detach-actor-from-movie.use-case";
import { UpdateActorMovieRoleUseCase } from "./update-actor-movie-role.use-case";

describe("actor/movie relation use-cases", () => {
  it("attaches an actor with an optional role", async () => {
    const repository: Pick<
      ICatalogRepository,
      "actorExists" | "movieExists" | "attachActorToMovie"
    > = {
      actorExists: vi.fn(async () => true),
      movieExists: vi.fn(async () => true),
      attachActorToMovie: vi.fn(async () => true),
    };

    await expect(
      new AttachActorToMovieUseCase(repository).execute(
        "actor-uuid",
        "movie-uuid",
        "Lead role",
      ),
    ).resolves.toBeUndefined();
    expect(repository.attachActorToMovie).toHaveBeenCalledWith(
      "actor-uuid",
      "movie-uuid",
      "Lead role",
    );
  });

  it("returns 404 when the actor does not exist or is soft-deleted", async () => {
    const repository: Pick<
      ICatalogRepository,
      "actorExists" | "movieExists" | "attachActorToMovie"
    > = {
      actorExists: vi.fn(async () => false),
      movieExists: vi.fn(async () => true),
      attachActorToMovie: vi.fn(async () => true),
    };

    await expect(
      new AttachActorToMovieUseCase(repository).execute("actor-uuid", "movie-uuid", null),
    ).rejects.toMatchObject<Partial<ActorMovieRelationError>>({
      statusCode: 404,
      message: "Actor not found",
    });
    expect(repository.attachActorToMovie).not.toHaveBeenCalled();
  });

  it("returns 404 when the movie does not exist or is soft-deleted", async () => {
    const repository: Pick<
      ICatalogRepository,
      "actorExists" | "movieExists" | "attachActorToMovie"
    > = {
      actorExists: vi.fn(async () => true),
      movieExists: vi.fn(async () => false),
      attachActorToMovie: vi.fn(async () => true),
    };

    await expect(
      new AttachActorToMovieUseCase(repository).execute("actor-uuid", "movie-uuid", null),
    ).rejects.toMatchObject({ statusCode: 404, message: "Movie not found" });
  });

  it("returns 409 for an already attached actor/movie pair", async () => {
    const repository: Pick<
      ICatalogRepository,
      "actorExists" | "movieExists" | "attachActorToMovie"
    > = {
      actorExists: vi.fn(async () => true),
      movieExists: vi.fn(async () => true),
      attachActorToMovie: vi.fn(async () => false),
    };

    await expect(
      new AttachActorToMovieUseCase(repository).execute("actor-uuid", "movie-uuid", null),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("detaches an existing relation and reports a missing relation", async () => {
    const repository: Pick<ICatalogRepository, "detachActorFromMovie"> = {
      detachActorFromMovie: vi.fn(async () => true),
    };
    const useCase = new DetachActorFromMovieUseCase(repository);
    await expect(useCase.execute("actor-uuid", "movie-uuid")).resolves.toBeUndefined();

    const missingRepository: Pick<ICatalogRepository, "detachActorFromMovie"> = {
      detachActorFromMovie: vi.fn(async () => false),
    };
    await expect(
      new DetachActorFromMovieUseCase(missingRepository).execute("actor-uuid", "movie-uuid"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("updates a role, including clearing it", async () => {
    const repository: Pick<ICatalogRepository, "updateActorMovieRole"> = {
      updateActorMovieRole: vi.fn(async () => true),
    };
    await expect(
      new UpdateActorMovieRoleUseCase(repository).execute(
        "actor-uuid",
        "movie-uuid",
        null,
      ),
    ).resolves.toBeUndefined();
    expect(repository.updateActorMovieRole).toHaveBeenCalledWith(
      "actor-uuid",
      "movie-uuid",
      null,
    );
  });
});
