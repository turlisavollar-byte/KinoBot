import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, genresTable } from "@workspace/db";
import {
  CreateGenreBody,
  UpdateGenreParams,
  UpdateGenreBody,
  DeleteGenreParams,
} from "@workspace/api-zod";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";

const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/genres",
  requirePermission(Permission.READ_CONTENT),
  async (_req, res): Promise<void> => {
    const genres = await db
      .select()
      .from(genresTable)
      .where(sql`${genresTable.deletedAt} IS NULL`)
      .orderBy(genresTable.name);
    res.json(genres);
  },
);

router.post(
  "/genres",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = CreateGenreBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [genre] = await db
      .insert(genresTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(genre);
  },
);

router.patch(
  "/genres/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateGenreParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UpdateGenreBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [genre] = await db
      .update(genresTable)
      .set(body.data)
      .where(eq(genresTable.id, params.data.id))
      .returning();
    if (!genre) {
      res.status(404).json({ error: "Genre not found" });
      return;
    }
    res.json(genre);
  },
);

router.delete(
  "/genres/:id",
  requirePermission(Permission.DELETE_CONTENT),
  async (req, res): Promise<void> => {
    const params = DeleteGenreParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .update(genresTable)
      .set({ deletedAt: new Date() })
      .where(eq(genresTable.id, params.data.id));
    res.sendStatus(204);
  },
);

export default router;
