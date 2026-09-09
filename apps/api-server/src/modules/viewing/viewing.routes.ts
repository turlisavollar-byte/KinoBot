import { Router } from "express";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";

const router = Router();
router.use(requireAuth);

/**
 * Viewing / Watch Progress endpoints — STUB
 * TODO: implement when viewing schema is ready
 */
router.get(
  "/viewing/history/:userId",
  requirePermission(Permission.READ_CONTENT),
  (_req, res) => res.json({ data: [], meta: { note: "stub" } }),
);
router.post(
  "/viewing/progress",
  requirePermission(Permission.UPDATE_CONTENT),
  (_req, res) => res.sendStatus(204),
);
router.post(
  "/viewing/ratings",
  requirePermission(Permission.UPDATE_CONTENT),
  (_req, res) =>
    res
      .status(501)
      .json({
        error: { code: "NOT_IMPLEMENTED", message: "Ratings coming soon" },
      }),
);
router.get(
  "/viewing/continue-watching/:userId",
  requirePermission(Permission.READ_CONTENT),
  (_req, res) => res.json({ data: [] }),
);

export default router;
