import { Router } from "express";
import { rbacController } from "./controllers/rbac.controller";
import { requireAuth } from "@/shared/middleware/requireAuth";
import { adminGuard, superAdminGuard } from "@/shared/middleware/admin.guard";

export function rbacRouter() {
  const router = Router();

  router.get("/rbac/roles", requireAuth, rbacController.list);
  router.get("/rbac/roles/:role", requireAuth, rbacController.getRoleDetail);
  router.get(
    "/rbac/me/permissions",
    requireAuth,
    rbacController.getMyPermissions,
  );
  router.get("/rbac/me/check", requireAuth, rbacController.checkMyPermission);
  router.get(
    "/rbac/permissions",
    requireAuth,
    adminGuard,
    rbacController.listPermissions,
  );
  router.get(
    "/rbac/permissions/:permission",
    requireAuth,
    adminGuard,
    rbacController.getPermissionRoles,
  );
  router.get("/rbac/matrix", requireAuth, adminGuard, rbacController.getMatrix);
  router.post(
    "/rbac/users/:id/role",
    requireAuth,
    superAdminGuard,
    (req, res) => void rbacController.assignRole(req, res),
  );

  return router;
}

export default rbacRouter;
