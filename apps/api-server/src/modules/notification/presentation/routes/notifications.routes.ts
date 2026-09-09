import { Router } from "express";
import type { NotificationController } from "../controllers/notification.controller";
import { requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";

export function createNotificationsRouter(
  notificationController: NotificationController,
): Router {
  const router = Router();

  router.get(
    "/templates",
    requirePermission(Permission.READ_NOTIFICATIONS),
    notificationController.listTemplates,
  );
  router.post(
    "/templates",
    requirePermission(Permission.MANAGE_NOTIFICATIONS),
    notificationController.createTemplate,
  );
  router.post(
    "/broadcast",
    requirePermission(Permission.SEND_NOTIFICATIONS),
    notificationController.createBroadcast,
  );
  router.get("/", notificationController.listNotifications);
  router.put("/read-all", notificationController.markAllRead);
  router.put("/:id/read", notificationController.markRead);

  return router;
}
