import type { Response } from "express";

export function sendOk<T>(res: Response, data: T): void {
  res.status(200).json({ success: true, data });
}

export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data });
}

export function sendNoContent(res: Response): void {
  res.sendStatus(204);
}

export function sendBadRequest(res: Response, message: string): void {
  res.status(400).json({ success: false, error: message });
}

export function sendNotFound(res: Response, resource: string): void {
  res.status(404).json({ success: false, error: `${resource} not found` });
}

export function sendUnauthorized(res: Response, message: string = "Unauthorized"): void {
  res.status(401).json({ success: false, error: message });
}

export function sendForbidden(res: Response, message: string = "Forbidden"): void {
  res.status(403).json({ success: false, error: message });
}

export function sendConflict(res: Response, message: string): void {
  res.status(409).json({ success: false, error: message });
}
