import type { Request, Response, NextFunction } from "express";
import { getAuthMiddlewareInstance } from "@/modules/identity";

// Use Identity module's canonical optional auth middleware
// This allows optional authentication for public endpoints
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const middleware = getAuthMiddlewareInstance();
  await middleware.optionalAuth(req, res, next);
}
