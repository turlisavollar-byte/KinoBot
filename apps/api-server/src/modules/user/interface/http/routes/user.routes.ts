// modules/user/interface/http/routes/user.routes.ts

import { Router } from "express";
import { container } from "tsyringe";
import { UserController } from "../controllers/user.controller";
import { requireAuth, requireRole } from "@/shared/middleware";
import { validate } from "@/shared/middleware";
import {
  ListUsersSchema,
  UpdateUserSchema,
  BlockUserSchema,
  ExportUsersSchema,
} from "../validators/user.validator";

const router = Router();
const controller = container.resolve(UserController);

// All routes require authentication
router.use(requireAuth);

// ─── Public (authenticated) ────────────────────────────────────────────────────

// GET /users/me - current authenticated user
router.get("/me", controller.me.bind(controller));

// GET /users - List users with filters
router.get(
  "/",
  requireRole("admin"),
  validate({ query: ListUsersSchema }),
  controller.list.bind(controller),
);

router.post(
  "/:id/subscription/grant",
  requireRole("admin"),
  controller.grantSubscription.bind(controller),
);

// GET /users/:id - Get single user
router.get("/:id", requireRole("admin"), controller.get.bind(controller));

// ─── Admin+ ────────────────────────────────────────────────────────────────────

// PATCH /users/:id - Update user
router.patch(
  "/:id",
  requireRole("admin"),
  validate({ body: UpdateUserSchema }),
  controller.update.bind(controller),
);

// POST /users/:id/block - Block/unblock user
router.post(
  "/:id/block",
  requireRole("admin"),
  validate({ body: BlockUserSchema }),
  controller.block.bind(controller),
);

// DELETE /users/:id - Delete user
router.delete(
  "/:id",
  requireRole("superadmin"),
  controller.delete.bind(controller),
);

// ─── Export ────────────────────────────────────────────────────────────────────

// POST /users/export - Export users
router.post(
  "/export",
  requireRole("admin"),
  validate({ query: ExportUsersSchema }),
  controller.export.bind(controller),
);

export default router;
