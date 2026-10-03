export class ActorMovieRelationError extends Error {
  constructor(
    message: string,
    readonly statusCode: 404 | 409,
  ) {
    super(message);
    this.name = "ActorMovieRelationError";
  }
}