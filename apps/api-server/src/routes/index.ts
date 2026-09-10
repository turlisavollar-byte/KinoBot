import { Router, type IRouter } from "express";

// ─── Core business routes (still using legacy structure) ─────────────────────
import subscriptionsRouter from "@/routes/subscriptions";
import telegramRouter from "@/routes/telegram";
import videoCodesRouter from "@/modules/video-content";
import adminUsersRouter from "@/routes/admin-users";
import actorsRouter from "@/routes/catalog/actors";
import genresRouter from "@/routes/catalog/genres";
import moviesRouter from "@/routes/catalog/movies";
import seriesRouter from "@/routes/catalog/series";
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

const router: IRouter = Router();

// Health (no auth)
router.use(healthRouter);

// Public identity auth routes must mount before root-level authenticated modules.
// This avoids global auth middleware in root routers from intercepting login/register requests.
// Note: app.ts already mounts router at /api, so we use relative paths here
router.use("/identity/auth", authRouter());
router.use(rbacModuleRouter());
router.use("/notifications", notificationModuleRouter());

// ─── Core business routes (legacy - to be migrated to DDD) ───────────────────
router.use(subscriptionsRouter);
router.use(telegramRouter);
router.use("/video-codes", videoCodesRouter());
router.use("/admin-users", adminUsersRouter);

// Legacy CRUD endpoints the dashboard client still calls.
router.use("/users", userModule.userRouter());
router.use(actorsRouter);
router.use(genresRouter);
router.use(moviesRouter);
router.use(seriesRouter);

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
  } catch (error) {
    console.error("Failed to initialize billing module:", error);
  }
});

export default router;
