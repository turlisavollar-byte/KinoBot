import { Router } from "express";
import { Permission } from "@/shared/constants/permissions";
import { requireAuth, requirePermission } from "@/shared/middleware";
import { AdminUsersRepository } from "../../../infrastructure/repositories/admin-users.repository";
import { ListAdminUsersUseCase } from "../../../application/use-cases/list-admin-users.use-case";
import { UpdateAdminUserUseCase } from "../../../application/use-cases/update-admin-user.use-case";
import { DeleteAdminUserUseCase } from "../../../application/use-cases/delete-admin-user.use-case";
import { GetAdminUserUseCase } from "../../../application/use-cases/get-admin-user.use-case";
import { BanAdminUserUseCase } from "../../../application/use-cases/ban-admin-user.use-case";
import { CreateAdminUserUseCase } from "../../../application/use-cases/create-admin-user.use-case";
import { AdminUsersController } from "../controllers/admin-users.controller";
import { rateLimit } from "express-rate-limit";
import { PasswordService } from "@/modules/identity/infrastructure/services/password.service";

const repository = new AdminUsersRepository();
const controller = new AdminUsersController(
  new ListAdminUsersUseCase(repository),
  new UpdateAdminUserUseCase(repository),
  new DeleteAdminUserUseCase(repository),
  new GetAdminUserUseCase(repository),
  new BanAdminUserUseCase(repository),
  new CreateAdminUserUseCase(repository, new PasswordService()),
);

const router = Router();
const adminMutationLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const adminCreateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/",
  requireAuth,
  requirePermission(Permission.CREATE_ADMIN_USERS),
  adminCreateLimit,
  controller.create,
);

router.get(
  "/",
  requireAuth,
  requirePermission(Permission.READ_ADMIN_USERS),
  controller.list,
);
router.get(
  "/:id",
  requireAuth,
  requirePermission(Permission.READ_ADMIN_USERS),
  controller.get,
);
router.patch(
  "/:id",
  requireAuth,
  requirePermission(Permission.UPDATE_ADMIN_USERS),
  adminMutationLimit,
  controller.update,
);
router.post(
  "/:id/ban",
  requireAuth,
  requirePermission(Permission.UPDATE_ADMIN_USERS),
  adminMutationLimit,
  controller.ban,
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission(Permission.DELETE_ADMIN_USERS),
  adminMutationLimit,
  controller.delete,
);

export default router;
