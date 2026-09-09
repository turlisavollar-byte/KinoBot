import type { Request, Response } from "express";
import { rbacService } from "../services/rbac.service";
import { Role, Roles } from "@/shared/constants/roles";
import { Permission } from "@/shared/constants/permissions";
import { createProblem } from "@/lib/problem";

export class RbacController {
  list = (_req: Request, res: Response): void => {
    const roles = rbacService.listRoles();
    res.json({ success: true, data: roles, total: roles.length });
  };

  getRoleDetail = (req: Request, res: Response): void => {
    const role = req.params["role"] as string;
    const validRoles = Object.values(Roles);
    if (!validRoles.includes(role as Role)) {
      res
        .status(404)
        .json(createProblem(404, "NOT_FOUND", `Role '${role}' not found.`));
      return;
    }

    const detail = rbacService.getRoleDetail(role as Role);
    res.json({ success: true, data: detail });
  };

  listPermissions = (_req: Request, res: Response): void => {
    const grouped = rbacService.listPermissionsGrouped();
    const total = grouped.reduce((s, g) => s + g.permissions.length, 0);
    res.json({ success: true, data: grouped, total });
  };

  getPermissionRoles = (req: Request, res: Response): void => {
    const permission = req.params["permission"] as string;
    const validPerms = Object.values(Permission);
    if (!validPerms.includes(permission as Permission)) {
      res
        .status(404)
        .json(
          createProblem(
            404,
            "NOT_FOUND",
            `Permission '${permission}' not found.`,
          ),
        );
      return;
    }

    const roles = rbacService.getPermissionRoles(permission as Permission);
    res.json({ success: true, permission, data: roles });
  };

  getMyPermissions = (req: Request, res: Response): void => {
    const user = req.user;
    if (!user?.role) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    const permissions = rbacService.getMyPermissions(
      user.id,
      user.role as Role,
    );
    res.json({
      success: true,
      role: user.role,
      data: permissions,
      total: permissions.length,
    });
  };

  checkMyPermission = (req: Request, res: Response): void => {
    const user = req.user;
    if (!user?.role) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    const { permission } = req.query as { permission?: string };

    if (!permission) {
      res
        .status(400)
        .json(
          createProblem(
            400,
            "VALIDATION_ERROR",
            "Query param 'permission' is required.",
          ),
        );
      return;
    }

    const validPerms = Object.values(Permission);
    if (!validPerms.includes(permission as Permission)) {
      res
        .status(400)
        .json(
          createProblem(
            400,
            "VALIDATION_ERROR",
            `Unknown permission: '${permission}'.`,
          ),
        );
      return;
    }

    const result = rbacService.checkPermission(
      user.id,
      user.role as Role,
      permission as Permission,
    );
    res.json({ success: true, data: result });
  };

  getMatrix = (_req: Request, res: Response): void => {
    const matrix = rbacService.getMatrix();
    res.json({ success: true, data: matrix });
  };

  assignRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user?.role) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }
      const targetUserId = req.params["id"] as string;
      const { role } = req.body as { role?: string };

      if (!role) {
        res
          .status(400)
          .json(createProblem(400, "VALIDATION_ERROR", "Role is required"));
        return;
      }

      const validRoles = Object.values(Roles);
      if (!validRoles.includes(role as Role)) {
        res
          .status(400)
          .json(
            createProblem(400, "VALIDATION_ERROR", `Invalid role: ${role}`),
          );
        return;
      }

      const result = await rbacService.assignRole(
        user.id,
        user.role as Role,
        targetUserId!,
        role as Role,
      );

      res.json({
        success: true,
        message: "Role assigned successfully.",
        data: result,
      });
    } catch (err) {
      const error = err as {
        statusCode?: number;
        code?: string;
        message?: string;
      };
      if (error.statusCode) {
        res
          .status(error.statusCode)
          .json(
            createProblem(
              error.statusCode,
              error.code || "ERROR",
              error.message || "An error occurred",
            ),
          );
        return;
      }
      res
        .status(500)
        .json(
          createProblem(500, "UNKNOWN_ERROR", "An internal error occurred"),
        );
    }
  };
}

export const rbacController = new RbacController();
