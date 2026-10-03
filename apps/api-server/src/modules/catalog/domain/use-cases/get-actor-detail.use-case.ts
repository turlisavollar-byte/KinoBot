import type { ActorDetail } from "../../catalog.types";
import type { ICatalogRepository } from "../repositories/catalog.repository.interface";

export class GetActorDetailUseCase {
  constructor(private readonly repository: ICatalogRepository) {}

  execute(actorId: string): Promise<ActorDetail | null> {
    return this.repository.getActorWithMovies(actorId);
  }
}