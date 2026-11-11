const DEFAULT_MAX_MOVIE_UPLOAD_BYTES = 1024 * 1024 * 1024;

const configuredMaxMovieUploadBytes = process.env.MAX_MOVIE_UPLOAD_SIZE;
if (configuredMaxMovieUploadBytes !== undefined) {
  const parsedMaxMovieUploadBytes = Number(configuredMaxMovieUploadBytes);
  if (
    !Number.isSafeInteger(parsedMaxMovieUploadBytes) ||
    parsedMaxMovieUploadBytes <= 0
  ) {
    throw new Error("MAX_MOVIE_UPLOAD_SIZE must be a positive safe integer");
  }
}

export const MAX_MOVIE_UPLOAD_BYTES = configuredMaxMovieUploadBytes
  ? Number(configuredMaxMovieUploadBytes)
  : DEFAULT_MAX_MOVIE_UPLOAD_BYTES;
export const MAX_MOVIE_UPLOAD_MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

export function formatMovieUploadLimit(bytes = MAX_MOVIE_UPLOAD_BYTES): string {
  const gibibyte = 1024 * 1024 * 1024;
  const mebibyte = 1024 * 1024;
  if (bytes % gibibyte === 0) return `${bytes / gibibyte} GiB`;
  if (bytes % mebibyte === 0) return `${bytes / mebibyte} MiB`;
  return `${bytes} bytes`;
}
