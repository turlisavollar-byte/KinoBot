import { Router, type IRouter } from "express";
import { rbacController } from "../controllers/rbac.controller";
import { requireAuth } from "@/shared/middleware/requireAuth";
import { adminGuard, superAdminGuard } from "@/shared/middleware/admin.guard";

const router: IRouter = Router();

// ─── Public (authenticated) ────────────────────────────────────────────────────
// List all roles with hierarchy + permission count
router.get("/rbac/roles", requireAuth, rbacController.list);

// Role detail with its full permission list
router.get("/rbac/roles/:role", requireAuth, rbacController.getRoleDetail);

// My permissions
router.get("/rbac/me/permissions", requireAuth, rbacController.getMyPermissions);

// Check a single permission: GET /api/rbac/me/check?permission=read:users
router.get("/rbac/me/check", requireAuth, rbacController.checkMyPermission);

// ─── Admin+ ────────────────────────────────────────────────────────────────────
// All permissions grouped by category + which roles have each
router.get("/rbac/permissions", requireAuth, adminGuard, rbacController.listPermissions);

// Which roles have a specific permission  (colon in value must be URL-encoded: read%3Ausers)
router.get(
  "/rbac/permissions/:permission",
  requireAuth,
  adminGuard,
  rbacController.getPermissionRoles,
);

// Full role × permission matrix
router.get("/rbac/matrix", requireAuth, adminGuard, rbacController.getMatrix);

// ─── Super admin ──────────────────────────────────────────────────────────────
// Assign role to user
router.post("/rbac/users/:id/role", requireAuth, superAdminGuard, (req, res) =>
  void rbacController.assignRole(req, res),
);

export default router;
