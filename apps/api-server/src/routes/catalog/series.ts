import { Router, type IRouter } from "express";
import { eq, and, count, inArray } from "drizzle-orm";
import {
  db,
  seriesTable,
  seriesGenresTable,
  genresTable,
  seasonsTable,
  episodesTable,
} from "@workspace/db";
import {
  ListSeriesQueryParams,
  GetSeriesParams,
  CreateSeriesBody,
  UpdateSeriesParams,
  UpdateSeriesBody,
  DeleteSeriesParams,
  PublishSeriesParams,
  PublishSeriesBody,
  ListSeasonsParams,
  CreateSeasonParams,
  CreateSeasonBody,
  ListEpisodesParams,
  CreateEpisodeParams,
  CreateEpisodeBody,
  UpdateEpisodeParams,
  UpdateEpisodeBody,
  DeleteEpisodeParams,
  PublishEpisodeParams,
  PublishEpisodeBody,
} from "@workspace/api-zod";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";
import { ilike, sql } from "drizzle-orm";

const router: IRouter = Router();
router.use(requireAuth);

async function getSeriesWithGenres(id: string) {
  const [series] = await db
    .select()
    .from(seriesTable)
    .where(eq(seriesTable.id, id))
    .limit(1);
  if (!series) return null;
  const genreRows = await db
    .select({ genre: genresTable })
    .from(seriesGenresTable)
    .innerJoin(genresTable, eq(seriesGenresTable.genreId, genresTable.id))
    .where(eq(seriesGenresTable.seriesId, id));
  return {
    ...series,
    viewsCount: Number(series.viewsCount),
    ratingAvg: parseFloat(series.ratingAvg ?? "0"),
    genres: genreRows.map((r) => r.genre),
  };
}

// ─── SERIES CRUD ─────────────────────────────────────────────────────────────
router.get(
  "/catalog/series",
  requirePermission(Permission.READ_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = ListSeriesQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { page = 1, limit = 20, search } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = [sql`${seriesTable.deletedAt} IS NULL`];
    if (search) conditions.push(ilike(seriesTable.title, `%${search}%`));
    const whereClause = and(...(conditions as ReturnType<typeof eq>[]));

    const [{ total }] = await db
      .select({ total: count() })
      .from(seriesTable)
      .where(whereClause);
    const items = await db
      .select()
      .from(seriesTable)
      .where(whereClause)
      .orderBy(seriesTable.createdAt)
      .limit(limit)
      .offset(offset);

    const ids = items.map((s) => s.id);
    const genreRows = ids.length
      ? await db
          .select({ seriesId: seriesGenresTable.seriesId, genre: genresTable })
          .from(seriesGenresTable)
          .innerJoin(genresTable, eq(seriesGenresTable.genreId, genresTable.id))
          .where(inArray(seriesGenresTable.seriesId, ids))
      : [];

    const byId: Record<string, (typeof genresTable.$inferSelect)[]> = {};
    for (const r of genreRows) {
      if (!byId[r.seriesId]) byId[r.seriesId] = [];
      byId[r.seriesId].push(r.genre);
    }

    res.json({
      data: items.map((s) => ({
        ...s,
        viewsCount: Number(s.viewsCount),
        ratingAvg: parseFloat(s.ratingAvg ?? "0"),
        genres: byId[s.id] ?? [],
      })),
      total,
      page,
      limit,
    });
  },
);

router.post(
  "/catalog/series",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = CreateSeriesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const seriesData = parsed.data;
    const [series] = await db
      .insert(seriesTable)
      .values(seriesData)
      .returning();
    res.status(201).json(await getSeriesWithGenres(series.id));
  },
);

router.get(
  "/catalog/series/:id",
  requirePermission(Permission.READ_CONTENT),
  async (req, res): Promise<void> => {
    const params = GetSeriesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const series = await getSeriesWithGenres(params.data.id);
    if (!series) {
      res.status(404).json({ error: "Series not found" });
      return;
    }
    res.json(series);
  },
);

router.patch(
  "/catalog/series/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateSeriesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UpdateSeriesBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const updateData = body.data;
    await db
      .update(seriesTable)
      .set(updateData)
      .where(eq(seriesTable.id, params.data.id));
    const series = await getSeriesWithGenres(params.data.id);
    if (!series) {
      res.status(404).json({ error: "Series not found" });
      return;
    }
    res.json(series);
  },
);

router.delete(
  "/catalog/series/:id",
  requirePermission(Permission.DELETE_CONTENT),
  async (req, res): Promise<void> => {
    const params = DeleteSeriesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .update(seriesTable)
      .set({ deletedAt: new Date() })
      .where(eq(seriesTable.id, params.data.id));
    res.sendStatus(204);
  },
);

router.post(
  "/catalog/series/:id/publish",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = PublishSeriesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = PublishSeriesBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    await db
      .update(seriesTable)
      .set({ isPublished: body.data.published })
      .where(eq(seriesTable.id, params.data.id));
    const series = await getSeriesWithGenres(params.data.id);
    if (!series) {
      res.status(404).json({ error: "Series not found" });
      return;
    }
    res.json(series);
  },
);

// ─── SEASONS ──────────────────────────────────────────────────────────────────
router.get(
  "/catalog/series/:id/seasons",
  requirePermission(Permission.READ_CONTENT),
  async (req, res): Promise<void> => {
    const params = ListSeasonsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const seasons = await db
      .select()
      .from(seasonsTable)
      .where(
        and(
          eq(seasonsTable.seriesId, params.data.id),
          sql`${seasonsTable.deletedAt} IS NULL`,
        ),
      )
      .orderBy(seasonsTable.seasonNumber);
    res.json(seasons);
  },
);

router.post(
  "/catalog/series/:id/seasons",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = CreateSeasonParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = CreateSeasonBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [season] = await db
      .insert(seasonsTable)
      .values({ ...body.data, seriesId: params.data.id })
      .returning();
    res.status(201).json(season);
  },
);

// ─── EPISODES ────────────────────────────────────────────────────────────────
router.get(
  "/catalog/series/:seriesId/seasons/:seasonId/episodes",
  async (req, res): Promise<void> => {
    const params = ListEpisodesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const episodes = await db
      .select()
      .from(episodesTable)
      .where(
        and(
          eq(episodesTable.seasonId, params.data.seasonId),
          sql`${episodesTable.deletedAt} IS NULL`,
        ),
      )
      .orderBy(episodesTable.episodeNumber);
    res.json(episodes.map((e) => ({ ...e, viewsCount: Number(e.viewsCount) })));
  },
);

router.post(
  "/catalog/series/:seriesId/seasons/:seasonId/episodes",
  async (req, res): Promise<void> => {
    const params = CreateEpisodeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = CreateEpisodeBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [ep] = await db
      .insert(episodesTable)
      .values({
        ...body.data,
        seasonId: params.data.seasonId,
      })
      .returning();
    res.status(201).json({ ...ep, viewsCount: Number(ep.viewsCount) });
  },
);

router.patch("/catalog/episodes/:id", async (req, res): Promise<void> => {
  const params = UpdateEpisodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateEpisodeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [ep] = await db
    .update(episodesTable)
    .set(body.data)
    .where(eq(episodesTable.id, params.data.id))
    .returning();
  if (!ep) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }
  res.json({ ...ep, viewsCount: Number(ep.viewsCount) });
});

router.delete("/catalog/episodes/:id", async (req, res): Promise<void> => {
  const params = DeleteEpisodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .update(episodesTable)
    .set({ deletedAt: new Date() })
    .where(eq(episodesTable.id, params.data.id));
  res.sendStatus(204);
});

router.post(
  "/catalog/episodes/:id/publish",
  async (req, res): Promise<void> => {
    const params = PublishEpisodeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = PublishEpisodeBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [ep] = await db
      .update(episodesTable)
      .set({ isPublished: body.data.published })
      .where(eq(episodesTable.id, params.data.id))
      .returning();
    if (!ep) {
      res.status(404).json({ error: "Episode not found" });
      return;
    }
    res.json({ ...ep, viewsCount: Number(ep.viewsCount) });
  },
);

export default router;
