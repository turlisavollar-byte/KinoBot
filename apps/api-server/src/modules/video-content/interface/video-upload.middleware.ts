import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import * as os from "node:os";

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, callback) =>
      callback(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) =>
    callback(null, file.mimetype.startsWith("video/")),
});

export function videoUploadMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single("video")(req, res, (error) => {
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    next();
  });
}
