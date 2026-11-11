import { randomUUID } from "node:crypto";
import multer from "multer";
import os from "node:os";
import { extname } from "node:path";
import type { NextFunction, Request, Response } from "express";

export const MAX_MOVIE_POSTER_UPLOAD_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

type MoviePosterExtension = keyof typeof IMAGE_TYPES;

export function isMoviePosterUpload(file: {
  originalname: string;
  mimetype: string;
}): boolean {
  const extension = extname(
    file.originalname,
  ).toLowerCase() as MoviePosterExtension;
  return IMAGE_TYPES[extension] === file.mimetype.toLowerCase();
}

export function hasMoviePosterSignature(
  header: Uint8Array,
  mimeType: string,
): boolean {
  const bytes = Buffer.from(header);
  if (mimeType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }
  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    );
  }
  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

export function getMoviePosterExtension(
  fileName: string,
): MoviePosterExtension | null {
  const extension = extname(fileName).toLowerCase() as MoviePosterExtension;
  return extension in IMAGE_TYPES ? extension : null;
}

export function createMoviePosterStorageKey(
  movieId: string,
  fileName: string,
): string {
  const extension = getMoviePosterExtension(fileName);
  if (!extension) throw new Error("Unsupported movie poster extension");
  return `movies/${movieId}/posters/${randomUUID()}${extension}`;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: MAX_MOVIE_POSTER_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, callback) =>
    callback(null, isMoviePosterUpload(file)),
}).single("poster");

export function moviePosterUploadMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload(req, res, (error?: unknown) => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      res.status(tooLarge ? 413 : 400).json({
        error: {
          code: tooLarge ? "POSTER_UPLOAD_TOO_LARGE" : "INVALID_POSTER_UPLOAD",
          message: tooLarge
            ? "Movie poster exceeds the 10 MiB limit"
            : error.message,
        },
      });
      return;
    }
    if (error) return next(error);
    next();
  });
}
