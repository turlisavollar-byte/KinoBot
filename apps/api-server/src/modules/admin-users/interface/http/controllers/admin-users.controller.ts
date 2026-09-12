import type { NextFunction, Request, Response } from "express";
import { ListAdminUsersUseCase } from "../../../application/use-cases/list-admin-users.use-case";
import { UpdateAdminUserUseCase } from "../../../application/use-cases/update-admin-user.use-case";
import { DeleteAdminUserUseCase } from "../../../application/use-cases/delete-admin-user.use-case";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";

export class AdminUsersController {
  constructor(
    private readonly listUsers: ListAdminUsersUseCase,
    private readonly updateUser: UpdateAdminUserUseCase,
    private readonly deleteUser: DeleteAdminUserUseCase,
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
      const result = await this.listUsers.execute({ page, pageSize, search });

      res.json({
        success: true,
        data: result.users.map((user) => ({
          ...user,
          status: user.isActive ? "active" : "inactive",
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        })),
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
      const updated = await this.updateUser.execute({
        actorId: actor.id,
        actorRole: actor.role,
        targetId,
        ...(req.body as { name?: string; email?: string; role?: string }),
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
      res.json({
        success: true,
        message: "Admin account deleted",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
