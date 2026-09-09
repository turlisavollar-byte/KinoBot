import { DrizzleNotificationsRepository } from "./infrastructure/repositories/drizzle-notifications.repository";
import { NotificationService } from "./application/services/notification.service";
import { NotificationController } from "./presentation/controllers/notification.controller";
import { createNotificationsRouter } from "./presentation/routes/notifications.routes";
import { requireAuth } from "@/lib/auth";
import { Router } from "express";
import { NotificationAdminService } from "./application/services/notification-admin.service";
import { BroadcastDeliveryWorker } from "./application/services/broadcast-delivery.worker";

let deliveryWorker: BroadcastDeliveryWorker | undefined;

export function notificationRouter() {
  const repository = new DrizzleNotificationsRepository();
  const service = new NotificationService(repository);
  const controller = new NotificationController(
    service,
    new NotificationAdminService(),
  );
  if (!deliveryWorker) {
    deliveryWorker = new BroadcastDeliveryWorker();
    deliveryWorker.start();
  }

  const router = Router();
  router.use(requireAuth);
  router.use(createNotificationsRouter(controller));
  return router;
}

export default notificationRouter;
