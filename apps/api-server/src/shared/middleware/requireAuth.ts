import type { Request, Response, NextFunction } from "express";
import { getAuthMiddlewareInstance } from "@/modules/identity";

// Use Identity module's canonical auth middleware
// This consolidates authentication logic and ensures DB is authoritative
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const middleware = getAuthMiddlewareInstance();
  await middleware.requireAuth(req, res, next);
}
