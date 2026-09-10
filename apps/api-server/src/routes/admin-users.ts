import { Router } from "express";
import { getUserRepo } from "@/modules/identity";
import { requireAuth, requireRole } from "@/shared/middleware";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  async (req, res, next): Promise<void> => {
    try {
      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
      const skip = (page - 1) * pageSize;

      const users = await getUserRepo()!.findAll({
        skip,
        take: pageSize,
        search,
      });

      const total = await getUserRepo()!.count({ search });

      res.json({
        success: true,
        data: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name,
          status: user.status,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        })),
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
