import type { ICatalogRepository } from "../repositories/catalog.repository.interface";
import { ActorMovieRelationError } from "./actor-movie.errors";

export class AttachActorToMovieUseCase {
  constructor(
    private readonly repository: Pick<
      ICatalogRepository,
      "actorExists" | "movieExists" | "attachActorToMovie"
    >,
  ) {}

  async execute(
    actorId: string,
    movieId: string,
    role: string | null,
  ): Promise<void> {
    const [actorExists, movieExists] = await Promise.all([
      this.repository.actorExists(actorId),
      this.repository.movieExists(movieId),
    ]);
    if (!actorExists) throw new ActorMovieRelationError("Actor not found", 404);
    if (!movieExists) throw new ActorMovieRelationError("Movie not found", 404);
    if (!(await this.repository.attachActorToMovie(actorId, movieId, role))) {
      throw new ActorMovieRelationError("Actor is already attached to this movie", 409);
    }
  }
}