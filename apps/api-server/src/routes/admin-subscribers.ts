import bcrypt from "bcrypt";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { and, eq, isNull } from "drizzle-orm";
import { db, usersTable, webRefreshSessionsTable } from "@workspace/db";
import { requireAuth, requirePermission } from "@/shared/middleware";
import { Permission } from "@/shared/constants/permissions";
import { Logger } from "@/shared/utils/logger";
import { generateTemporarySubscriberPassword } from "@/modules/admin-subscriber-password";

const router = Router();
const logger = Logger.getInstance("AdminSubscribers");
const passwordResetLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/:id/password-reset",
  requireAuth,
  requirePermission(Permission.UPDATE_USERS),
  passwordResetLimit,
  async (req, res, next): Promise<void> => {
    const userId = req.params.id;
    if (typeof userId !== "string" || userId.length < 1 || userId.length > 128) {
      res.status(400).json({ success: false, error: "Invalid user ID" });
      return;
    }

    try {
      const temporaryPassword = generateTemporarySubscriberPassword();
      const passwordHash = await bcrypt.hash(
        temporaryPassword,
        Number(process.env.BCRYPT_SALT_ROUNDS || 12),
      );
      const revokedAt = new Date();
      const updated = await db.transaction(async (tx) => {
        const [target] = await tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(and(eq(usersTable.id, userId), isNull(usersTable.deletedAt)))
          .limit(1);
        if (!target) return false;

        await tx
          .update(usersTable)
          .set({ passwordHash, updatedAt: revokedAt })
          .where(eq(usersTable.id, userId));
        await tx
          .update(webRefreshSessionsTable)
          .set({ revokedAt })
          .where(
            and(
              eq(webRefreshSessionsTable.userId, userId),
              isNull(webRefreshSessionsTable.revokedAt),
            ),
          );
        return true;
      });

      if (!updated) {
        res.status(404).json({ success: false, error: "Subscriber not found" });
        return;
      }

      logger.info("Subscriber password reset by authorized administrator", { userId });
      res.json({ success: true, temporaryPassword });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
