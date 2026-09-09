import { Router, type IRouter } from "express";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";
import { CodeGeneratorService } from "./domain/services/code-generator.service";
import { DrizzleVideoCodeRepository } from "./infrastructure/repositories/drizzle-video-code.repository";
import { DrizzleChannelService } from "./infrastructure/services/drizzle-channel.service";
import { TelegramVideoService } from "./infrastructure/services/telegram-video.service";
import { VideoContentService } from "./application/services/video-content.service";
import { VideoContentController } from "./interface/video-content.controller";
import { videoUploadMiddleware } from "./interface/video-upload.middleware";

export function createVideoContentRouter(): IRouter {
  const repository = new DrizzleVideoCodeRepository();
  const service = new VideoContentService(
    repository,
    new CodeGeneratorService(),
    new TelegramVideoService(),
    new DrizzleChannelService(),
  );
  const controller = new VideoContentController(service);
  const router = Router();

  router.use(requireAuth);
  router.get(
    "/",
    requirePermission(Permission.READ_CONTENT),
    controller.list.bind(controller),
  );
  router.post(
    "/upload",
    requirePermission(Permission.CREATE_CONTENT),
    videoUploadMiddleware,
    controller.upload.bind(controller),
  );
  router.post(
    "/import",
    requirePermission(Permission.CREATE_CONTENT),
    controller.import.bind(controller),
  );
  router.patch(
    "/:id",
    requirePermission(Permission.UPDATE_CONTENT),
    controller.update.bind(controller),
  );
  router.delete(
    "/:id",
    requirePermission(Permission.DELETE_CONTENT),
    controller.delete.bind(controller),
  );
  return router;
}

export default createVideoContentRouter;
