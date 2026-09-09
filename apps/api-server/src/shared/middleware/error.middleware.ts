import type { Request, Response, NextFunction } from "express";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";
import { logger } from "@/lib/logger";

declare module "express" {
  interface Request {
    id?: string;
    log?: {
      info: (data: any, msg: string) => void;
      error: (data: any, msg: string) => void;
      warn: (data: any, msg: string) => void;
      debug: (data: any, msg: string) => void;
    };
  }
}

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, reqId: req.id }, "Non-operational error");
    }
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.metadata && { metadata: err.metadata }),
        ...(process.env["NODE_ENV"] !== "production" && { stack: err.stack }),
      },
    });
    return;
  }

  // Unexpected / unhandled errors
  logger.error({ err, reqId: req.id }, "Unhandled error");
  res.status(500).json({
    error: {
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message:
        process.env["NODE_ENV"] === "production"
          ? "Internal server error"
          : err.message,
    },
  });
}
