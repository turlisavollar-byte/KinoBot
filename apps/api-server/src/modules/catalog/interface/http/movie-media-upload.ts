import { randomUUID } from "node:crypto";
import multer from "multer";
import os from "node:os";
import type { NextFunction, Request, Response } from "express";

export const MAX_MOVIE_UPLOAD_BYTES = 1024 * 1024 * 1024;

export function isMovieMp4Upload(file: { originalname: string; mimetype: string }): boolean {
  return /\.mp4$/i.test(file.originalname) && file.mimetype.toLowerCase() === "video/mp4";
}

export function hasMp4Signature(header: Uint8Array): boolean {
  return header.byteLength >= 8 && Buffer.from(header).toString("ascii", 4, 8) === "ftyp";
}

export function createMovieStorageKey(movieId: string): string {
  return `movies/${movieId}/${randomUUID()}.mp4`;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: MAX_MOVIE_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, isMovieMp4Upload(file)),
}).single("video");

export function movieMediaUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  upload(req, res, (error?: unknown) => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      res.status(tooLarge ? 413 : 400).json({
        error: {
          code: tooLarge ? "MOVIE_UPLOAD_TOO_LARGE" : "INVALID_MOVIE_UPLOAD",
          message: tooLarge ? "Movie upload exceeds the 1 GiB limit" : error.message,
        },
      });
      return;
    }
    if (error) return next(error);
    next();
  });
}
