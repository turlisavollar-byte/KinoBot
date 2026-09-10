import { Router } from "express";
import { BillingController } from "./BillingController";
import { validate, requireAuth, requirePermission } from "@/shared/middleware";
import { Permission } from "@/shared/constants/permissions";
import {
  CreateSubscriptionSchema,
  SubscriptionIdSchema,
  CancelSubscriptionSchema,
  ExtendSubscriptionSchema,
  ListSubscriptionsQuerySchema,
  CreatePlanSchema,
  UpdatePlanSchema,
  PlanIdSchema,
} from "../application";

export function createSubscriptionRouter(controller: BillingController): Router {
  const router = Router();

  // Apply authentication to all subscription routes
  router.use(requireAuth);

  // ===== Plans =====
  router.get(
    "/plans",
    requirePermission(Permission.READ_SUBSCRIPTIONS),
    (req, res, next) => controller.listPlans(req, res, next),
  );
  router.post(
    "/plans",
    requirePermission(Permission.MANAGE_SUBSCRIPTIONS),
    validate({ body: CreatePlanSchema }),
    (req, res, next) => controller.createPlan(req, res, next),
  );
  router.get(
    "/plans/:id",
    requirePermission(Permission.READ_SUBSCRIPTIONS),
    validate({ params: PlanIdSchema }),
    (req, res, next) => controller.getPlan(req, res, next),
  );
  router.patch(
    "/plans/:id",
    requirePermission(Permission.MANAGE_SUBSCRIPTIONS),
    validate({ params: PlanIdSchema, body: UpdatePlanSchema }),
    (req, res, next) => controller.updatePlan(req, res, next),
  );

  // ===== Subscriptions =====
  router.get(
    "/",
    requirePermission(Permission.READ_SUBSCRIPTIONS),
    validate({ query: ListSubscriptionsQuerySchema }),
    (req, res, next) => controller.listSubscriptions(req, res, next),
  );
  router.post(
    "/",
    requirePermission(Permission.CREATE_SUBSCRIPTIONS),
    validate({ body: CreateSubscriptionSchema }),
    (req, res, next) => controller.createSubscription(req, res, next),
  );
  router.get(
    "/:id",
    requirePermission(Permission.READ_SUBSCRIPTIONS),
    validate({ params: SubscriptionIdSchema }),
    (req, res, next) => controller.getSubscription(req, res, next),
  );
  router.patch(
    "/:id/cancel",
    requirePermission(Permission.MANAGE_SUBSCRIPTIONS),
    validate({ params: SubscriptionIdSchema }),
    (req, res, next) => controller.cancelSubscription(req, res, next),
  );
  router.post(
    "/:id/extend",
    requirePermission(Permission.MANAGE_SUBSCRIPTIONS),
    validate({ params: SubscriptionIdSchema, body: ExtendSubscriptionSchema }),
    (req, res, next) => controller.extendSubscription(req, res, next),
  );

  return router;
}