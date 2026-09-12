import { Router } from "express";
import { Permission } from "@/shared/constants/permissions";
import { requireAuth, requirePermission } from "@/shared/middleware";
import { AdminUsersRepository } from "../../../infrastructure/repositories/admin-users.repository";
import { ListAdminUsersUseCase } from "../../../application/use-cases/list-admin-users.use-case";
import { UpdateAdminUserUseCase } from "../../../application/use-cases/update-admin-user.use-case";
import { DeleteAdminUserUseCase } from "../../../application/use-cases/delete-admin-user.use-case";
import { AdminUsersController } from "../controllers/admin-users.controller";

const repository = new AdminUsersRepository();
const controller = new AdminUsersController(
  new ListAdminUsersUseCase(repository),
  new UpdateAdminUserUseCase(repository),
  new DeleteAdminUserUseCase(repository),
);

const router = Router();
router.get(
  "/",
  requireAuth,
  requirePermission(Permission.READ_ADMIN_USERS),
  controller.list,
);
router.patch(
  "/:id",
  requireAuth,
  requirePermission(Permission.UPDATE_ADMIN_USERS),
  controller.update,
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission(Permission.DELETE_ADMIN_USERS),
  controller.delete,
);

export default router;
