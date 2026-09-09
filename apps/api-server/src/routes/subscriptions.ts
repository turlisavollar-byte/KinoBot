import { Router, type IRouter } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, subscriptionPlansTable, subscriptionsTable } from "@workspace/db";
import {
  CreateSubscriptionPlanBody,
  UpdateSubscriptionPlanParams,
  UpdateSubscriptionPlanBody,
  ListSubscriptionsQueryParams,
  CancelSubscriptionParams,
  ExtendSubscriptionParams,
  ExtendSubscriptionBody,
} from "@workspace/api-zod";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";

const router: IRouter = Router();
router.use(requireAuth);

// ─── PLANS ───────────────────────────────────────────────────────────────────
router.get(
  "/subscriptions/plans",
  requirePermission(Permission.READ_SUBSCRIPTIONS),
  async (_req, res): Promise<void> => {
    const plans = await db
      .select()
      .from(subscriptionPlansTable)
      .where(sql`${subscriptionPlansTable.deletedAt} IS NULL`)
      .orderBy(subscriptionPlansTable.price);
    res.json(plans.map((p) => ({ ...p, price: parseFloat(p.price) })));
  },
);

router.post(
  "/subscriptions/plans",
  requirePermission(Permission.MANAGE_SUBSCRIPTIONS),
  async (req, res): Promise<void> => {
    const parsed = CreateSubscriptionPlanBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [plan] = await db
      .insert(subscriptionPlansTable)
      .values({
        ...parsed.data,
        tier: "standard",
        price: String(parsed.data.price),
      })
      .returning();
    res.status(201).json({ ...plan, price: parseFloat(plan.price) });
  },
);

router.patch(
  "/subscriptions/plans/:id",
  requirePermission(Permission.MANAGE_SUBSCRIPTIONS),
  async (req, res): Promise<void> => {
    const params = UpdateSubscriptionPlanParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UpdateSubscriptionPlanBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const { price, ...rest } = body.data;
    const updateData = {
      ...rest,
      ...(price !== undefined ? { price: String(price) } : {}),
    };
    const [plan] = await db
      .update(subscriptionPlansTable)
      .set(updateData)
      .where(eq(subscriptionPlansTable.id, params.data.id))
      .returning();
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    res.json({ ...plan, price: parseFloat(plan.price) });
  },
);

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
router.get(
  "/subscriptions",
  requirePermission(Permission.READ_SUBSCRIPTIONS),
  async (req, res): Promise<void> => {
    const parsed = ListSubscriptionsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { page = 1, limit = 20 } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(subscriptionsTable)
      .where(whereClause);
    const subs = await db
      .select({ sub: subscriptionsTable, plan: subscriptionPlansTable })
      .from(subscriptionsTable)
      .innerJoin(
        subscriptionPlansTable,
        eq(subscriptionsTable.planId, subscriptionPlansTable.id),
      )
      .where(whereClause)
      .orderBy(subscriptionsTable.createdAt)
      .limit(limit)
      .offset(offset);

    res.json({
      data: subs.map(({ sub, plan }) => ({
        ...sub,
        planName: plan.name,
      })),
      total,
      page,
      limit,
    });
  },
);

router.post(
  "/subscriptions/:id/cancel",
  requirePermission(Permission.MANAGE_SUBSCRIPTIONS),
  async (req, res): Promise<void> => {
    const params = CancelSubscriptionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [sub] = await db
      .update(subscriptionsTable)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(subscriptionsTable.id, params.data.id))
      .returning();
    if (!sub) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }
    const [plan] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, sub.planId));
    res.json({ ...sub, planName: plan?.name ?? "" });
  },
);

router.post(
  "/subscriptions/:id/extend",
  requirePermission(Permission.MANAGE_SUBSCRIPTIONS),
  async (req, res): Promise<void> => {
    const params = ExtendSubscriptionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = ExtendSubscriptionBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, params.data.id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }

    const baseDate =
      existing.endDate > new Date() ? existing.endDate : new Date();
    const endDate = new Date(baseDate);
    endDate.setUTCDate(endDate.getUTCDate() + body.data.days);

    const [sub] = await db
      .update(subscriptionsTable)
      .set({
        endDate,
        status: "active",
        cancelledAt: null,
      })
      .where(eq(subscriptionsTable.id, existing.id))
      .returning();
    const [plan] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, existing.planId))
      .limit(1);

    res.json({ ...sub, planName: plan?.name ?? "" });
  },
);

export default router;
