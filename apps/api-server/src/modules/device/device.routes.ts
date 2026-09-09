import { Router } from "express";
import { deviceController } from "./device.controller";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";

const router = Router();
router.use(requireAuth);

router.get(
  "/users/:userId/devices",
  requirePermission(Permission.READ_USERS),
  deviceController.list.bind(deviceController),
);
router.post(
  "/users/:userId/devices",
  requirePermission(Permission.UPDATE_USERS),
  deviceController.register.bind(deviceController),
);
router.delete(
  "/users/:userId/devices/:deviceId",
  requirePermission(Permission.UPDATE_USERS),
  deviceController.remove.bind(deviceController),
);
router.patch(
  "/devices/:deviceId/block",
  requirePermission(Permission.LOCK_USERS),
  deviceController.block.bind(deviceController),
);

export default router;
