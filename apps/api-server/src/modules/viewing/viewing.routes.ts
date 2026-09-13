import { Router } from "express";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";
import { viewingService } from "./viewing.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/viewing/history/:userId",
  requirePermission(Permission.READ_CONTENT),
  async (req, res, next) => {
    try {
      const data = await viewingService.getWatchHistory(
        String(req.params["userId"]),
      );
      res.json({ data });
    } catch (error) {
      next(error);
    }
  },
);
router.post(
  "/viewing/progress",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.sendStatus(401);
        return;
      }
      await viewingService.upsertProgress(userId, req.body);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  },
);
router.post(
  "/viewing/ratings",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.sendStatus(401);
        return;
      }
      await viewingService.submitRating(userId, req.body);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  },
);
router.get(
  "/viewing/continue-watching/:userId",
  requirePermission(Permission.READ_CONTENT),
  async (req, res, next) => {
    try {
      const data = await viewingService.getContinueWatching(
        String(req.params["userId"]),
      );
      res.json({ data });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
