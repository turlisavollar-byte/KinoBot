import type { Request, Response } from "express";
import { ErrorCodes } from "@/shared/errors/errorCodes";

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
