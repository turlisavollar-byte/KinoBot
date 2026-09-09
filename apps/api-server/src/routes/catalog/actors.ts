import { Router, type IRouter } from "express";
import { eq, ilike, and, count, sql } from "drizzle-orm";
import { db, actorsTable } from "@workspace/db";
import {
  ListActorsQueryParams,
  CreateActorBody,
  UpdateActorParams,
  UpdateActorBody,
} from "@workspace/api-zod";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";

const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/actors",
  requirePermission(Permission.READ_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = ListActorsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { page = 1, limit = 20, search } = parsed.data;
    const offset = (page - 1) * limit;
    const conditions = [sql`${actorsTable.deletedAt} IS NULL`];
    if (search) conditions.push(ilike(actorsTable.name, `%${search}%`));
    const whereClause = and(...(conditions as ReturnType<typeof eq>[]));
    const [{ total }] = await db
      .select({ total: count() })
      .from(actorsTable)
      .where(whereClause);
    const actors = await db
      .select()
      .from(actorsTable)
      .where(whereClause)
      .orderBy(actorsTable.name)
      .limit(limit)
      .offset(offset);
    res.json(actors);
  },
);

router.post(
  "/actors",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = CreateActorBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [actor] = await db
      .insert(actorsTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(actor);
  },
);

router.patch(
  "/actors/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateActorParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UpdateActorBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [actor] = await db
      .update(actorsTable)
      .set(body.data)
      .where(eq(actorsTable.id, params.data.id))
      .returning();
    if (!actor) {
      res.status(404).json({ error: "Actor not found" });
      return;
    }
    res.json(actor);
  },
);

export default router;
