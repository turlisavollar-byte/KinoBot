import type { ICatalogRepository } from "../repositories/catalog.repository.interface";
import { ActorMovieRelationError } from "./actor-movie.errors";

export class DetachActorFromMovieUseCase {
  constructor(
    private readonly repository: Pick<ICatalogRepository, "detachActorFromMovie">,
  ) {}

  async execute(actorId: string, movieId: string): Promise<void> {
    const detached = await this.repository.detachActorFromMovie(actorId, movieId);
    if (!detached) {
      throw new ActorMovieRelationError("Actor/movie relation not found", 404);
    }
  }
}