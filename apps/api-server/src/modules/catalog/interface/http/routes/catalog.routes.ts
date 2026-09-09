import { Router } from "express";
import { container } from "tsyringe";
import { CatalogController } from "../controllers/catalog.controller";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Lazy controller resolution
function getController() {
  return container.resolve(CatalogController);
}

// ─── MOVIES ──────────────────────────────────────────────────────────────────
router.get(
  "/catalog/movies",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listMovies(req, res, next),
);
router.post(
  "/catalog/movies",
  requirePermission(Permission.CREATE_CONTENT),
  (req, res, next) => getController().createMovie(req, res, next),
);
router.get(
  "/catalog/movies/:id",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().getMovie(req, res, next),
);
router.patch(
  "/catalog/movies/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  (req, res, next) => getController().updateMovie(req, res, next),
);
router.delete(
  "/catalog/movies/:id",
  requirePermission(Permission.DELETE_CONTENT),
  (req, res, next) => getController().deleteMovie(req, res, next),
);
router.post(
  "/catalog/movies/:id/publish",
  requirePermission(Permission.UPDATE_CONTENT),
  (req, res, next) => getController().publishMovie(req, res, next),
);

// ─── SERIES ──────────────────────────────────────────────────────────────────
router.get(
  "/catalog/series",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listSeries(req, res, next),
);

// ─── GENRES ──────────────────────────────────────────────────────────────────
router.get(
  "/catalog/genres",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listGenres(req, res, next),
);

// ─── ACTORS ──────────────────────────────────────────────────────────────────
router.get(
  "/catalog/actors",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listActors(req, res, next),
);

export default router;
