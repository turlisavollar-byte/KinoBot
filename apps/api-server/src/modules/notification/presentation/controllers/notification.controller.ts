import type { Request, Response, NextFunction } from "express";
import type { NotificationService } from "../../application/services/notification.service";
import type { NotificationAdminService } from "../../application/services/notification-admin.service";
import {
  CreateNotificationTemplateBody,
  BroadcastNotificationBody,
} from "@workspace/api-zod";

export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly adminService: NotificationAdminService,
  ) {}

  listTemplates = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      res.json(await this.adminService.listTemplates());
    } catch (err) {
      next(err);
    }
  };

  createTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = CreateNotificationTemplateBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }
      res.status(201).json(await this.adminService.createTemplate(parsed.data));
    } catch (err) {
      next(err);
    }
  };

  createBroadcast = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = BroadcastNotificationBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }
      res.status(202).json(
        await this.adminService.createBroadcast({
          templateId: parsed.data.templateId,
          recipients: parsed.data.recipients,
          recipientType: parsed.data.recipientType,
          data: parsed.data.data,
        }),
      );
    } catch (err) {
      next(err);
    }
  };

  listNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

      const result = await this.notificationService.listNotifications(
        String(req.user.id),
        page,
        limit,
      );
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (err) {
      next(err);
    }
  };

  markRead = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const notification = await this.notificationService.markRead(
        String(req.params.id),
        String(req.user.id),
      );
      res.json({ success: true, data: notification });
    } catch (err) {
      next(err);
    }
  };

  markAllRead = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      await this.notificationService.markAllRead(String(req.user.id));
      res.json({ success: true, data: { success: true } });
    } catch (err) {
      next(err);
    }
  };
}
