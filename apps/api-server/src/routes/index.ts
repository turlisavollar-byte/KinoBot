import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, moviesTable, seriesTable } from "@workspace/db";

// ─── Core business routes (still using legacy structure) ─────────────────────
import telegramRouter from "@/routes/telegram";
import videoCodesRouter from "@/modules/video-content";
import adminUsersRouter from "@/modules/admin-users/interface/http/routes/admin-users.routes";
import catalogModuleRouter from "@/modules/catalog";
import rbacModuleRouter from "@/modules/rbac";
import notificationModuleRouter from "@/modules/notification";

// ─── New module routes (controller/service/repository pattern) ────────────────
import healthRouter from "@/modules/health/health.routes";
import deviceRouter from "@/modules/device/device.routes";
import featureFlagRouter from "@/modules/feature-flag/feature-flag.routes";
import auditRouter from "@/modules/audit/audit.routes";
import searchRouter from "@/modules/search/search.routes";
import advertisingRouter from "@/modules/advertising/advertising.routes";
import integrationRouter from "@/modules/integration/integration.routes";
import viewingRouter from "@/modules/viewing/viewing.routes";
import { authRouter } from "@/modules/identity";
import userModule from "@/modules/user";
import { analyticsRouter } from "@/modules/analytics";
import billingModule from "@/modules/billing";
import webRouter from "@/routes/web";

const router: IRouter = Router();

// Health (no auth)
router.use(healthRouter);

// Public identity auth routes must mount before root-level authenticated modules.
// This avoids global auth middleware in root routers from intercepting login/register requests.
// Note: app.ts already mounts router at /api, so we use relative paths here
router.use("/identity/auth", authRouter());
router.use("/auth", authRouter());
router.use("/web", webRouter);
router.use(rbacModuleRouter());
router.use("/notifications", notificationModuleRouter());

// Public catalog lists must be mounted before the legacy router-wide auth middleware.
router.get("/movies", async (_req, res, next) => {
  try {
    const movies = await db
      .select({
        id: moviesTable.id,
        title: moviesTable.title,
        description: moviesTable.description,
        releaseYear: moviesTable.releaseYear,
        duration: moviesTable.duration,
        ageRating: moviesTable.ageRating,
        posterUrl: moviesTable.posterUrl,
        backgroundUrl: moviesTable.backgroundUrl,
        trailerUrl: moviesTable.trailerUrl,
        ratingAvg: moviesTable.ratingAvg,
      })
      .from(moviesTable)
      .where(
        and(eq(moviesTable.isPublished, true), isNull(moviesTable.deletedAt)),
      )
      .orderBy(desc(moviesTable.createdAt));
    res.json({ data: movies });
  } catch (error) {
    next(error);
  }
});

router.get("/series", async (_req, res, next) => {
  try {
    const series = await db
      .select({
        id: seriesTable.id,
        title: seriesTable.title,
        description: seriesTable.description,
        releaseYear: seriesTable.releaseYear,
        ageRating: seriesTable.ageRating,
        posterUrl: seriesTable.posterUrl,
        backgroundUrl: seriesTable.backgroundUrl,
        seasonsCount: seriesTable.seasonsCount,
        ratingAvg: seriesTable.ratingAvg,
      })
      .from(seriesTable)
      .where(
        and(eq(seriesTable.isPublished, true), isNull(seriesTable.deletedAt)),
      )
      .orderBy(desc(seriesTable.createdAt));
    res.json({ data: series });
  } catch (error) {
    next(error);
  }
});

// ─── Core business routes (legacy - to be migrated to DDD) ───────────────────
router.use(telegramRouter);
router.use("/video-codes", videoCodesRouter());
router.use("/admin/users", adminUsersRouter);
router.use("/admin-users", adminUsersRouter);

// Legacy CRUD endpoints the dashboard client still calls.
router.use("/users", userModule.userRouter());
router.use(catalogModuleRouter);

// ─── Feature modules (modern structure) ───────────────────────────────────────
router.use(deviceRouter);
router.use(featureFlagRouter);
router.use("/audit-logs", auditRouter);
router.use(searchRouter);
router.use(advertisingRouter);
router.use(integrationRouter);
router.use(viewingRouter);
router.use("/analytics", analyticsRouter);

// New billing module (DDD architecture with full payment provider support)
// Initialize billing module after server starts to avoid blocking startup
process.nextTick(() => {
  try {
    billingModule.initBillingModule(router);
    billingModule.initSubscriptionModule(router);
  } catch (error) {
    console.error("Failed to initialize billing module:", error);
  }
});

export default router;
