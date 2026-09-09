import { Router } from "express";
import { BillingController } from "./BillingController";
import { validate, requireAuth } from "@/shared/middleware";
import { requirePermission } from "@/lib/auth";
import {
  CreatePlanSchema,
  UpdatePlanSchema,
  PlanIdSchema,
  CreateSubscriptionSchema,
  SubscriptionIdSchema,
  CreateInvoiceSchema,
  InvoiceIdSchema,
  CreatePaymentSchema,
  PaymentIdSchema,
  CreateClickPaymentSchema,
  CreatePaymePaymentSchema,
  CreateUzumPaymentSchema,
  CreatePaynetPaymentSchema,
  CreateAnorPaymentSchema,
  CreateNBUPaymentSchema,
  CreateUzcardPaymentSchema,
  CreateOctoPaymentSchema,
} from "../application";

export function createBillingRouter(controller: BillingController): Router {
  const router = Router();

  // Provider callbacks authenticate with provider-specific credentials/signatures.
  router.post("/click/webhook", (req, res, next) =>
    controller.clickWebhook(req, res, next),
  );
  router.post("/payme/webhook", (req, res, next) =>
    controller.paymeWebhook(req, res, next),
  );
  router.post("/uzum/webhook", (req, res, next) =>
    controller.uzumWebhook(req, res, next),
  );
  router.post("/paynet/webhook", (req, res, next) =>
    controller.paynetWebhook(req, res, next),
  );
  router.post("/anor/webhook", (req, res, next) =>
    controller.anorWebhook(req, res, next),
  );
  router.post("/nbu/webhook", (req, res, next) =>
    controller.nbuWebhook(req, res, next),
  );
  router.post("/uzcard/webhook", (req, res, next) =>
    controller.uzcardWebhook(req, res, next),
  );
  router.post("/octo/webhook", (req, res, next) =>
    controller.octoWebhook(req, res, next),
  );

  // Apply authentication to all billing routes
  router.use(requireAuth);

  // ===== Plans =====
  router.post(
    "/plans",
    requirePermission("manage:billing"),
    validate({ body: CreatePlanSchema }),
    (req, res, next) => controller.createPlan(req, res, next),
  );
  router.get("/plans", (req, res, next) =>
    controller.listPlans(req, res, next),
  );
  router.get(
    "/plans/:id",
    validate({ params: PlanIdSchema }),
    (req, res, next) => controller.getPlan(req, res, next),
  );
  router.put(
    "/plans/:id",
    requirePermission("manage:billing"),
    validate({ params: PlanIdSchema, body: UpdatePlanSchema }),
    (req, res, next) => controller.updatePlan(req, res, next),
  );
  router.delete(
    "/plans/:id",
    requirePermission("manage:billing"),
    validate({ params: PlanIdSchema }),
    (req, res, next) => controller.deletePlan(req, res, next),
  );

  // ===== Subscriptions =====
  router.post(
    "/subscriptions",
    validate({ body: CreateSubscriptionSchema }),
    (req, res, next) => controller.createSubscription(req, res, next),
  );
  router.get("/subscriptions/user/:userId", (req, res, next) =>
    controller.listSubscriptions(req, res, next),
  );
  router.get(
    "/subscriptions/:id",
    validate({ params: SubscriptionIdSchema }),
    (req, res, next) => controller.getSubscription(req, res, next),
  );
  router.patch(
    "/subscriptions/:id/cancel",
    validate({ params: SubscriptionIdSchema }),
    (req, res, next) => controller.cancelSubscription(req, res, next),
  );

  // ===== Invoices =====
  router.post(
    "/invoices",
    validate({ body: CreateInvoiceSchema }),
    (req, res, next) => controller.createInvoice(req, res, next),
  );
  router.get("/invoices/user/:userId", (req, res, next) =>
    controller.listInvoices(req, res, next),
  );
  router.get(
    "/invoices/:id",
    validate({ params: InvoiceIdSchema }),
    (req, res, next) => controller.getInvoice(req, res, next),
  );
  router.patch(
    "/invoices/:id/pay",
    requirePermission("manage:billing"),
    validate({ params: InvoiceIdSchema }),
    (req, res, next) => controller.markInvoicePaid(req, res, next),
  );

  // ===== Payments =====
  router.get("/payments", (req, res, next) =>
    controller.listPayments(req, res, next),
  );
  router.post(
    "/payments",
    validate({ body: CreatePaymentSchema }),
    (req, res, next) => controller.createPayment(req, res, next),
  );
  router.get("/payments/user/:userId", (req, res, next) =>
    controller.listPayments(req, res, next),
  );
  router.get(
    "/payments/:id",
    validate({ params: PaymentIdSchema }),
    (req, res, next) => controller.getPayment(req, res, next),
  );
  router.patch(
    "/payments/:id/refund",
    requirePermission("manage:billing"),
    validate({ params: PaymentIdSchema }),
    (req, res, next) => controller.refundPayment(req, res, next),
  );

  // ===== Click =====
  router.post(
    "/click/pay",
    validate({ body: CreateClickPaymentSchema }),
    (req, res, next) => controller.createClickPayment(req, res, next),
  );

  // ===== Payme =====
  router.post(
    "/payme/pay",
    validate({ body: CreatePaymePaymentSchema }),
    (req, res, next) => controller.createPaymePayment(req, res, next),
  );

  // ===== Uzum =====
  router.post(
    "/uzum/pay",
    validate({ body: CreateUzumPaymentSchema }),
    (req, res, next) => controller.createUzumPayment(req, res, next),
  );

  // ===== Paynet =====
  router.post(
    "/paynet/pay",
    validate({ body: CreatePaynetPaymentSchema }),
    (req, res, next) => controller.createPaynetPayment(req, res, next),
  );

  // ===== Anor =====
  router.post(
    "/anor/pay",
    validate({ body: CreateAnorPaymentSchema }),
    (req, res, next) => controller.createAnorPayment(req, res, next),
  );

  // ===== NBU =====
  router.post(
    "/nbu/pay",
    validate({ body: CreateNBUPaymentSchema }),
    (req, res, next) => controller.createNBUPayment(req, res, next),
  );

  // ===== Uzcard/Humo =====
  router.post(
    "/uzcard/pay",
    validate({ body: CreateUzcardPaymentSchema }),
    (req, res, next) => controller.createUzcardPayment(req, res, next),
  );

  // ===== Octo =====
  router.post(
    "/octo/pay",
    validate({ body: CreateOctoPaymentSchema }),
    (req, res, next) => controller.createOctoPayment(req, res, next),
  );

  return router;
}
