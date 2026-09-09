import { Router } from "express";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";

const router = Router();
router.use(requireAuth);

/**
 * Advertising endpoints — STUB
 * TODO: Implement when ad system is ready
 */
router.get(
  "/ads/campaigns",
  requirePermission(Permission.MANAGE_SYSTEM),
  (_req, res) => res.json({ data: [], meta: { note: "stub" } }),
);
router.post(
  "/ads/campaigns",
  requirePermission(Permission.MANAGE_SYSTEM),
  (_req, res) =>
    res
      .status(501)
      .json({
        error: {
          code: "NOT_IMPLEMENTED",
          message: "Advertising module coming soon",
        },
      }),
);
router.post(
  "/ads/:adId/impression",
  requirePermission(Permission.MANAGE_SYSTEM),
  (_req, res) => res.sendStatus(204),
);
router.post(
  "/ads/:adId/click",
  requirePermission(Permission.MANAGE_SYSTEM),
  (_req, res) => res.sendStatus(204),
);

export default router;
