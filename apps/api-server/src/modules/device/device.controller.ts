import type { Request, Response, NextFunction } from "express";
import { deviceService } from "@/modules/device/device.service";

export class DeviceController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params["userId"]);
      const devices = await deviceService.getUserDevices(userId);
      res.json({ data: devices });
    } catch (err) { next(err); }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params["userId"]);
      const device = await deviceService.registerDevice(userId, req.body);
      res.status(201).json({ data: device });
    } catch (err) { next(err); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params["userId"]);
      const deviceId = String(req.params["deviceId"]);
      await deviceService.removeDevice(deviceId, userId);
      res.sendStatus(204);
    } catch (err) { next(err); }
  }

  async block(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deviceId = String(req.params["deviceId"]);
      await deviceService.blockDevice(deviceId);
      res.sendStatus(204);
    } catch (err) { next(err); }
  }
}

export const deviceController = new DeviceController();
