// modules/user/interface/http/controllers/user.controller.ts

import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import { ListUsersUseCase } from "../../../application/use-cases/list-users.use-case";
import { GetUserUseCase } from "../../../application/use-cases/get-user.use-case";
import { UpdateUserUseCase } from "../../../application/use-cases/update-user.use-case";
import { BlockUserUseCase } from "../../../application/use-cases/block-user.use-case";
import { DeleteUserUseCase } from "../../../application/use-cases/delete-user.use-case";
import { ExportUsersUseCase } from "../../../application/use-cases/export-users.use-case";
import { UserFilters } from "../../../domain/repositories/user.repository.interface";
import {
  updateUserSchema,
  blockUserSchema,
  listUsersFilterSchema,
  type UpdateUserDto,
  type BlockUserDto,
  type ListUsersFilterDto,
} from "../../../application/dto/user-request.dto";
import { Logger } from "@/shared/utils/logger";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import {
  db,
  subscriptionPlansTable,
  subscriptionsTable,
  usersTable,
  watchSessionsTable,
} from "@workspace/db";

@injectable()
export class UserController {
  private readonly logger = Logger.getInstance("UserController");

  constructor(
    @inject("ListUsersUseCase")
    private readonly listUsers: ListUsersUseCase,
    @inject("GetUserUseCase")
    private readonly getUser: GetUserUseCase,
    @inject("UpdateUserUseCase")
    private readonly updateUser: UpdateUserUseCase,
    @inject("BlockUserUseCase")
    private readonly blockUser: BlockUserUseCase,
    @inject("DeleteUserUseCase")
    private readonly deleteUser: DeleteUserUseCase,
    @inject("ExportUsersUseCase")
    private readonly exportUsers: ExportUsersUseCase,
  ) {}

  // GET /users
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = this.parseListFilters(req.query);

      const result = await this.listUsers.execute(filters);
      const userIds = result.data.map((user) => user.id);
      const subscriptions = userIds.length
        ? await db
            .select({
              userId: subscriptionsTable.userId,
              id: subscriptionsTable.id,
              planId: subscriptionsTable.planId,
              planName: subscriptionPlansTable.name,
              endDate: subscriptionsTable.endDate,
              autoRenew: subscriptionsTable.autoRenew,
            })
            .from(subscriptionsTable)
            .innerJoin(
              subscriptionPlansTable,
              eq(subscriptionsTable.planId, subscriptionPlansTable.id),
            )
            .where(
              and(
                inArray(subscriptionsTable.userId, userIds),
                eq(subscriptionsTable.status, "active"),
                gt(subscriptionsTable.endDate, new Date()),
              ),
            )
            .orderBy(desc(subscriptionsTable.endDate))
        : [];
      const subscriptionByUser = new Map<
        string,
        (typeof subscriptions)[number]
      >();
      for (const subscription of subscriptions) {
        if (!subscriptionByUser.has(subscription.userId)) {
          subscriptionByUser.set(subscription.userId, subscription);
        }
      }

      res.json({
        success: true,
        data: result.data.map((user) => ({
          ...user.toPublicData(),
          activeSubscription: subscriptionByUser.get(user.id) ?? null,
        })),
        meta: result.meta,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /users/:id
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const includeDeleted = req.query.includeDeleted === "true";

      const user = await this.getUser.execute(id, includeDeleted);
      const [subscription] = await db
        .select({
          subscription: subscriptionsTable,
          plan: subscriptionPlansTable,
        })
        .from(subscriptionsTable)
        .innerJoin(
          subscriptionPlansTable,
          eq(subscriptionsTable.planId, subscriptionPlansTable.id),
        )
        .where(
          and(
            eq(subscriptionsTable.userId, id),
            eq(subscriptionsTable.status, "active"),
            gt(subscriptionsTable.endDate, new Date()),
          ),
        )
        .orderBy(desc(subscriptionsTable.endDate))
        .limit(1);
      const [watchStats] = await db
        .select({
          watchCount: sql<number>`count(*)`,
          totalWatchMinutes: sql<number>`coalesce(sum(${watchSessionsTable.durationWatched}) / 60, 0)`,
        })
        .from(watchSessionsTable)
        .where(eq(watchSessionsTable.userId, id));

      res.json({
        success: true,
        data: {
          ...user.toPublicData(),
          dailyCodeLimit: user.dailyCodeLimit ?? null,
          dailyCodeUsed: user.dailyCodeUsed,
          weeklyCodeLimit: user.weeklyCodeLimit ?? null,
          weeklyCodeUsed: user.weeklyCodeUsed,
          monthlyCodeLimit: user.monthlyCodeLimit ?? null,
          monthlyCodeUsed: user.monthlyCodeUsed,
          trialExpiresAt: user.trialExpiresAt?.toISOString() ?? null,
          referralRewardTier: user.referralRewardTier,
          referralCode: user.referralCode ?? null,
          referredBy: user.referredBy ?? null,
          acquisitionSource: user.acquisitionSource ?? null,
          activeSubscription: subscription
            ? { ...subscription.subscription, planName: subscription.plan.name }
            : null,
          watchCount: Number(watchStats?.watchCount ?? 0),
          totalWatchMinutes: Number(watchStats?.totalWatchMinutes ?? 0),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /users/me
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = (req as any).user?.id;
      if (!currentUserId) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const user = await this.getUser.execute(currentUserId);
      res.json({
        success: true,
        data: user.toPublicData(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /users/:id
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const actorId = (req as any).user?.id;
      const actorRole = (req as any).user?.role;

      // Validate request body
      const validatedData: UpdateUserDto = updateUserSchema.parse(req.body);

      const user = await this.updateUser.execute(
        id,
        { ...validatedData, actorRole },
        actorId,
      );

      res.json({
        success: true,
        data: user.toPublicData(),
        message: "User updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /users/:id/subscription/grant
  async grantSubscription(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { planId, durationDays, autoRenew } = req.body as {
        planId?: string;
        durationDays?: number;
        autoRenew?: boolean;
      };
      if (!planId) {
        res
          .status(400)
          .json({ success: false, error: { message: "planId is required" } });
        return;
      }
      const [user] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);
      if (!user) {
        res
          .status(404)
          .json({ success: false, error: { message: "User not found" } });
        return;
      }
      const [plan] = await db
        .select()
        .from(subscriptionPlansTable)
        .where(
          and(
            eq(subscriptionPlansTable.id, planId),
            eq(subscriptionPlansTable.isActive, true),
          ),
        )
        .limit(1);
      if (!plan) {
        res.status(404).json({
          success: false,
          error: { message: "Subscription plan not found" },
        });
        return;
      }
      const now = new Date();
      const [current] = await db
        .select({ endDate: subscriptionsTable.endDate })
        .from(subscriptionsTable)
        .where(
          and(
            eq(subscriptionsTable.userId, id),
            eq(subscriptionsTable.status, "active"),
            gt(subscriptionsTable.endDate, now),
          ),
        )
        .orderBy(desc(subscriptionsTable.endDate))
        .limit(1);
      const startDate = current?.endDate ?? now;
      const endDate = new Date(startDate);
      endDate.setUTCDate(
        endDate.getUTCDate() + (durationDays ?? plan.durationDays),
      );
      const [subscription] = await db
        .insert(subscriptionsTable)
        .values({
          userId: id,
          planId: plan.id,
          status: "active",
          startDate,
          endDate,
          autoRenew: autoRenew ?? false,
        })
        .returning();
      res.status(201).json({
        success: true,
        data: { ...subscription, planName: plan.name },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /users/:id/block
  async block(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const actorId = (req as any).user?.id;
      const actorRole = (req as any).user?.role;

      // Validate request body
      const validatedData: BlockUserDto = blockUserSchema.parse(req.body);

      const user = await this.blockUser.execute(
        id,
        actorId,
        validatedData.blocked,
        validatedData.reason,
        actorRole,
      );

      res.json({
        success: true,
        data: user.toPublicData(),
        message: `User ${validatedData.blocked ? "blocked" : "unblocked"} successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /users/:id
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const actorId = (req as any).user?.id;
      const soft = req.query.soft !== "false";

      await this.deleteUser.execute(id, actorId, soft);

      res.json({
        success: true,
        message: `User ${soft ? "soft deleted" : "permanently deleted"} successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /users/export
  async export(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = this.parseListFilters(req.query);
      const format = ((req.query.format as string) || "json") as "json" | "csv";

      const result = await this.exportUsers.execute(filters, format);

      // Set headers for file download
      res.setHeader("Content-Type", result.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );
      res.setHeader("Cache-Control", "no-cache");

      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }

  // Private helper
  private parseListFilters(query: any): UserFilters {
    try {
      const validated: ListUsersFilterDto = listUsersFilterSchema.parse(query);

      const filters: UserFilters = {
        search: validated.search,
        status: validated.status
          ? (validated.status.split(",") as any)
          : undefined,
        role: validated.role ? (validated.role.split(",") as any) : undefined,
        isActive: validated.isActive,
        isBlocked: validated.isBlocked,
        isDeleted: validated.isDeleted,
        startDate: validated.startDate
          ? new Date(validated.startDate)
          : undefined,
        endDate: validated.endDate ? new Date(validated.endDate) : undefined,
        sortBy: validated.sortBy,
        sortOrder: validated.sortOrder,
        page: validated.page || 1,
        limit: validated.limit || 20,
        includeDeleted: validated.includeDeleted,
      };

      return filters;
    } catch (error) {
      this.logger.warn("Failed to parse list filters", { error, query });
      // Return default filters on validation error
      return {
        page: 1,
        limit: 20,
      };
    }
  }
}
