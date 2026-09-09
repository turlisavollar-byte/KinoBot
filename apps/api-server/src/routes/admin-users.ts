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
          ? req.query.search.trim().toLowerCase()
          : "";
      const users = await getUserRepo()!.findAll({ take: 100 });
      const filtered = search
        ? users.filter((user) =>
            [user.name, user.email, user.role.name].some((value) =>
              value.toLowerCase().includes(search),
            ),
          )
        : users;

      res.json({
        success: true,
        data: filtered.map((user) => ({
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
        meta: { total: filtered.length },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
