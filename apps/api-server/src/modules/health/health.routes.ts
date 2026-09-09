import { Router } from "express";
import { healthController } from "./health.controller";

const router = Router();

router.get("/health", healthController.check.bind(healthController));
router.get("/health/ready", healthController.ready.bind(healthController));
router.get("/health/live", healthController.live.bind(healthController));

export default router;
