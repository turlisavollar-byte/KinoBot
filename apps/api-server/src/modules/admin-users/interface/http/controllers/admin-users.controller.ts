import type { NextFunction, Request, Response } from "express";
import { ListAdminUsersUseCase } from "../../../application/use-cases/list-admin-users.use-case";
import { UpdateAdminUserUseCase } from "../../../application/use-cases/update-admin-user.use-case";
import { DeleteAdminUserUseCase } from "../../../application/use-cases/delete-admin-user.use-case";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";
import { GetAdminUserUseCase } from "../../../application/use-cases/get-admin-user.use-case";
import { BanAdminUserUseCase } from "../../../application/use-cases/ban-admin-user.use-case";
import { logAuditEvent } from "@/shared/utils/audit";
import { toSafeAdminUser } from "./admin-user-response";
import { z } from "zod";

export class AdminUsersController {
  constructor(
    private readonly listUsers: ListAdminUsersUseCase,
    private readonly updateUser: UpdateAdminUserUseCase,
    private readonly deleteUser: DeleteAdminUserUseCase,
    private readonly getUser: GetAdminUserUseCase,
    private readonly banUser: BanAdminUserUseCase,
  ) {}

  list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const page = Math.max(
        1,
        Number.parseInt(String(req.query.page ?? "1"), 10) || 1,
      );
      const pageSize = Math.min(
        100,
        Math.max(
          1,
          Number.parseInt(String(req.query.pageSize ?? "50"), 10) || 50,
        ),
      );
      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : undefined;
      const actor = req.user;
      if (!actor?.id || !actor.role) {
        throw new AppError(
          "Authentication required",
          401,
          ErrorCodes.UNAUTHORIZED,
        );
      }
      const result = await this.listUsers.execute(
        { page, pageSize, search },
        { id: actor.id, role: actor.role },
      );

      res.json({
        success: true,
        data: result.users.map(toSafeAdminUser),
        meta: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  get = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const actor = req.user;
      if (!actor?.id || !actor.role) {
        throw new AppError(
          "Authentication required",
          401,
          ErrorCodes.UNAUTHORIZED,
        );
      }
      const targetId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const user = await this.getUser.execute(actor.id, actor.role, targetId);

      res.json({
        success: true,
        data: toSafeAdminUser(user),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const actor = req.user;
      const targetId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!actor?.id || !actor.role) {
        throw new AppError(
          "Authentication required",
          401,
          ErrorCodes.UNAUTHORIZED,
        );
      }
      const body = z
        .object({
          name: z.string().trim().min(1).max(120).optional(),
          email: z.string().trim().email().max(255).optional(),
          role: z
            .enum(["superadmin", "admin", "manager", "moderator", "user", "viewer"])
            .optional(),
        })
        .strict()
        .parse(req.body);
      const updated = await this.updateUser.execute({
        actorId: actor.id,
        actorRole: actor.role,
        targetId,
        name: body.name,
        email: body.email,
        role: body.role,
      });
      await logAuditEvent({
        action: body.role ? "ROLE_CHANGED" : "UPDATE",
        targetType: "ADMIN",
        targetId,
        actorId: actor.id,
        actorType: "ADMIN",
        newValue: { name: body.name, email: body.email, role: body.role },
        req,
      });
      res.json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const actor = req.user;
      const targetId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!actor?.id || !actor.role) {
        throw new AppError(
          "Authentication required",
          401,
          ErrorCodes.UNAUTHORIZED,
        );
      }
      await this.deleteUser.execute(actor.id, actor.role, targetId);
      await logAuditEvent({
        action: "DELETE",
        targetType: "ADMIN",
        targetId,
        actorId: actor.id,
        actorType: "ADMIN",
        req,
      });
      res.json({
        success: true,
        message: "Admin account deleted",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  ban = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const actor = req.user;
      if (!actor?.id || !actor.role) {
        throw new AppError(
          "Authentication required",
          401,
          ErrorCodes.UNAUTHORIZED,
        );
      }
      const targetId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const banned = req.body?.banned;
      if (typeof banned !== "boolean") {
        throw new AppError(
          "banned must be a boolean",
          400,
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      await this.banUser.execute(actor.id, actor.role, targetId, banned);
      await logAuditEvent({
        action: "UPDATE",
        targetType: "ADMIN",
        targetId,
        actorId: actor.id,
        actorType: "ADMIN",
        newValue: { isActive: !banned },
        req,
      });

      res.json({
        success: true,
        data: { id: targetId, isActive: !banned },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
