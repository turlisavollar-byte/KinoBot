import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";
import { validate } from "@/shared/middleware";
import { logAuditEvent } from "@/shared/utils/audit";
import { Logger } from "@/shared/utils/logger";
import {
  getSettings,
  getTrialDurationDays,
  resetAllTrials,
  setTrialDurationDays,
} from "./settings.service";

const updateSettingsSchema = z
  .object({
    trial_duration_days: z.number().int().min(0).max(365),
  })
  .strict();

const resetAllTrialsSchema = z
  .object({
    days: z.number().int().min(1).max(365),
    onlyExpired: z.boolean().default(true),
    preview: z.boolean().default(true),
  })
  .strict();

const router = Router();
const logger = Logger.getInstance("SettingsRoutes");
router.use(requireAuth);

export async function updateTrialDurationWithAudit(
  req: Request,
  trialDurationDays: number,
): Promise<number> {
  const previous = await getTrialDurationDays();
  const updated = await setTrialDurationDays(trialDurationDays);

  try {
    const auditResult = await logAuditEvent({
      action: "CONFIG_CHANGED",
      targetType: "CONFIG",
      targetId: "trial_duration_days",
      targetName: "Trial duration",
      oldValue: { trial_duration_days: previous },
      newValue: { trial_duration_days: trialDurationDays },
      req,
    });
    if (!auditResult.success) {
      logger.error("Failed to write audit log for trial duration change", {
        logId: auditResult.logId,
      });
    }
  } catch (error) {
    logger.error("Failed to write audit log for trial duration change", {
      error,
    });
  }

  return updated;
}

router.get(
  "/settings",
  requirePermission(Permission.MANAGE_SYSTEM),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({
        success: true,
        data: await getSettings(),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/settings",
  requirePermission(Permission.MANAGE_SYSTEM),
  validate({ body: updateSettingsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trialDurationDays = req.body.trial_duration_days as number;
      await updateTrialDurationWithAudit(req, trialDurationDays);
      res.json({
        success: true,
        data: { trial_duration_days: trialDurationDays },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/settings/reset-all-trials",
  requirePermission(Permission.MANAGE_SYSTEM),
  validate({ body: resetAllTrialsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { days, onlyExpired, preview } = req.body as z.infer<
        typeof resetAllTrialsSchema
      >;
      const affectedCount = await resetAllTrials(days, onlyExpired, preview);

      if (!preview) {
        const auditResult = await logAuditEvent({
          action: "TRIAL_RESET_ALL",
          targetType: "USER",
          targetId: "all",
          targetName: "All user trials",
          oldValue: { onlyExpired },
          newValue: { days, onlyExpired, affectedCount },
          req,
        });
        if (!auditResult.success) {
          logger.error("Failed to write audit log for global trial reset", {
            affectedCount,
            logId: auditResult.logId,
          });
        }
      }

      res.json({
        success: true,
        data: { affectedCount, days, onlyExpired, preview },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
