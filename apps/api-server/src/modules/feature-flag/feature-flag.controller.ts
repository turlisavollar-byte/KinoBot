import type { Request, Response, NextFunction } from "express";
import { featureFlagService } from "@/modules/feature-flag/feature-flag.service";
import type { FlagStatus } from "@/modules/feature-flag/feature-flag.types";

export class FeatureFlagController {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const flags = await featureFlagService.list();
      res.json({ data: flags });
    } catch (err) { next(err); }
  }

  async evaluate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const key = String(req.params["key"]);
      const userId = req.query["userId"] ? String(req.query["userId"]) : undefined;
      const result = await featureFlagService.evaluate(key, userId);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const flag = await featureFlagService.upsert(req.body);
      res.status(201).json({ data: flag });
    } catch (err) { next(err); }
  }

  async setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const key = String(req.params["key"]);
      const status = String(req.params["status"]) as FlagStatus;
      await featureFlagService.setStatus(key, status);
      res.sendStatus(204);
    } catch (err) { next(err); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await featureFlagService.delete(String(req.params["key"]));
      res.sendStatus(204);
    } catch (err) { next(err); }
  }
}

export const featureFlagController = new FeatureFlagController();
