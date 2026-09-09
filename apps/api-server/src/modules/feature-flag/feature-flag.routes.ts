import { Router } from "express";
import { featureFlagController } from "./feature-flag.controller";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";

const router = Router();
router.use(requireAuth);

router.get(
  "/feature-flags",
  requirePermission(Permission.MANAGE_SYSTEM),
  featureFlagController.list.bind(featureFlagController),
);
router.get(
  "/feature-flags/:key/evaluate",
  requirePermission(Permission.MANAGE_SYSTEM),
  featureFlagController.evaluate.bind(featureFlagController),
);
router.put(
  "/feature-flags",
  requirePermission(Permission.MANAGE_SYSTEM),
  featureFlagController.upsert.bind(featureFlagController),
);
router.patch(
  "/feature-flags/:key/status/:status",
  requirePermission(Permission.MANAGE_SYSTEM),
  featureFlagController.setStatus.bind(featureFlagController),
);
router.delete(
  "/feature-flags/:key",
  requirePermission(Permission.MANAGE_SYSTEM),
  featureFlagController.remove.bind(featureFlagController),
);

export default router;
