import type { ICatalogRepository } from "../repositories/catalog.repository.interface";
import { ActorMovieRelationError } from "./actor-movie.errors";

export class UpdateActorMovieRoleUseCase {
  constructor(
    private readonly repository: Pick<ICatalogRepository, "updateActorMovieRole">,
  ) {}

  async execute(
    actorId: string,
    movieId: string,
    role: string | null,
  ): Promise<void> {
    const updated = await this.repository.updateActorMovieRole(
      actorId,
      movieId,
      role,
    );
    if (!updated) {
      throw new ActorMovieRelationError("Actor/movie relation not found", 404);
    }
  }
}