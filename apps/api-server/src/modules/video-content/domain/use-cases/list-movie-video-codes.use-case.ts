import type { IVideoCodeRepository } from "../repositories/video-code.repository.interface";

export class ListMovieVideoCodesUseCase {
  constructor(
    private readonly repository: Pick<
      IVideoCodeRepository,
      "movieExists" | "findByMovieId"
    >,
  ) {}

  async execute(movieId: string) {
    if (!(await this.repository.movieExists(movieId))) {
      throw new Error("Movie not found");
    }
    return this.repository.findByMovieId(movieId);
  }
}