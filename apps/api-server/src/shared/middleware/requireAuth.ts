import type { Request, Response, NextFunction } from "express";
import { requireAuth as baseRequireAuth } from "@/lib/auth";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await baseRequireAuth(req, res, next);
}
