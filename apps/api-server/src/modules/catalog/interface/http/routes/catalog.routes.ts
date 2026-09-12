import { Router } from "express";
import { and, count, eq, ilike, inArray, sql } from "drizzle-orm";
import {
  db,
  episodesTable,
  actorsTable,
  genresTable,
  seasonsTable,
  seriesGenresTable,
  seriesTable,
} from "@workspace/db";
import {
  CreateEpisodeBody,
  CreateEpisodeParams,
  CreateSeasonBody,
  CreateSeasonParams,
  CreateSeriesBody,
  DeleteEpisodeParams,
  DeleteSeriesParams,
  GetSeriesParams,
  ListEpisodesParams,
  ListSeasonsParams,
  ListSeriesQueryParams,
  PublishEpisodeBody,
  PublishEpisodeParams,
  PublishSeriesBody,
  PublishSeriesParams,
  UpdateEpisodeBody,
  UpdateEpisodeParams,
  UpdateSeriesBody,
  UpdateSeriesParams,
  ListActorsQueryParams,
  CreateActorBody,
  UpdateActorParams,
  UpdateActorBody,
  CreateGenreBody,
  UpdateGenreParams,
  UpdateGenreBody,
  DeleteGenreParams,
} from "@workspace/api-zod";
import { CatalogController } from "../controllers/catalog.controller";
import { requireAuth, requirePermission } from "@/shared/middleware";
import { Permission } from "@/shared/constants/permissions";
import { DrizzleCatalogRepository } from "../../../application/repositories/drizzle-catalog.repository";
import { ListMoviesUseCase } from "../../../domain/use-cases/list-movies.use-case";
import { GetMovieUseCase } from "../../../domain/use-cases/get-movie.use-case";
import { CreateMovieUseCase } from "../../../domain/use-cases/create-movie.use-case";
import { UpdateMovieUseCase } from "../../../domain/use-cases/update-movie.use-case";
import { DeleteMovieUseCase } from "../../../domain/use-cases/delete-movie.use-case";
import { ListSeriesUseCase } from "../../../domain/use-cases/list-series.use-case";
import { ListGenresUseCase } from "../../../domain/use-cases/list-genres.use-case";
import { ListActorsUseCase } from "../../../domain/use-cases/list-actors.use-case";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Lazy controller resolution
function getController() {
  const repository = new DrizzleCatalogRepository();
  return new CatalogController(
    new ListMoviesUseCase(repository),
    new GetMovieUseCase(repository),
    new CreateMovieUseCase(repository),
    new UpdateMovieUseCase(repository),
    new DeleteMovieUseCase(repository),
    new ListSeriesUseCase(repository),
    new ListGenresUseCase(repository),
    new ListActorsUseCase(repository),
  );
}

// ─── MOVIES ──────────────────────────────────────────────────────────────────
router.get(
  "/catalog/movies",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listMovies(req, res, next),
);
router.post(
  "/catalog/movies",
  requirePermission(Permission.CREATE_CONTENT),
  (req, res, next) => getController().createMovie(req, res, next),
);
router.get(
  "/catalog/movies/:id",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().getMovie(req, res, next),
);
router.patch(
  "/catalog/movies/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  (req, res, next) => getController().updateMovie(req, res, next),
);
router.delete(
  "/catalog/movies/:id",
  requirePermission(Permission.DELETE_CONTENT),
  (req, res, next) => getController().deleteMovie(req, res, next),
);
router.post(
  "/catalog/movies/:id/publish",
  requirePermission(Permission.UPDATE_CONTENT),
  (req, res, next) => getController().publishMovie(req, res, next),
);

// ─── SERIES ──────────────────────────────────────────────────────────────────
router.get(
  "/catalog/series",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listSeries(req, res, next),
);

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
    genres: genreRows.map((row) => row.genre),
  };
}

router.post(
  "/catalog/series",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = CreateSeriesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [series] = await db
      .insert(seriesTable)
      .values(parsed.data)
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
    const body = UpdateSeriesBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    await db
      .update(seriesTable)
      .set(body.data)
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
    const body = PublishSeriesBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
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
    const body = CreateSeasonBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [season] = await db
      .insert(seasonsTable)
      .values({ ...body.data, seriesId: params.data.id })
      .returning();
    res.status(201).json(season);
  },
);

router.get(
  "/catalog/series/:seriesId/seasons/:seasonId/episodes",
  requirePermission(Permission.READ_CONTENT),
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
    res.json(
      episodes.map((episode) => ({
        ...episode,
        viewsCount: Number(episode.viewsCount),
      })),
    );
  },
);

router.post(
  "/catalog/series/:seriesId/seasons/:seasonId/episodes",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = CreateEpisodeParams.safeParse(req.params);
    const body = CreateEpisodeBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [episode] = await db
      .insert(episodesTable)
      .values({ ...body.data, seasonId: params.data.seasonId })
      .returning();
    res
      .status(201)
      .json({ ...episode, viewsCount: Number(episode.viewsCount) });
  },
);

router.patch(
  "/catalog/episodes/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateEpisodeParams.safeParse(req.params);
    const body = UpdateEpisodeBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [episode] = await db
      .update(episodesTable)
      .set(body.data)
      .where(eq(episodesTable.id, params.data.id))
      .returning();
    if (!episode) {
      res.status(404).json({ error: "Episode not found" });
      return;
    }
    res.json({ ...episode, viewsCount: Number(episode.viewsCount) });
  },
);

router.delete(
  "/catalog/episodes/:id",
  requirePermission(Permission.DELETE_CONTENT),
  async (req, res): Promise<void> => {
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
  },
);

router.post(
  "/catalog/episodes/:id/publish",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = PublishEpisodeParams.safeParse(req.params);
    const body = PublishEpisodeBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [episode] = await db
      .update(episodesTable)
      .set({ isPublished: body.data.published })
      .where(eq(episodesTable.id, params.data.id))
      .returning();
    if (!episode) {
      res.status(404).json({ error: "Episode not found" });
      return;
    }
    res.json({ ...episode, viewsCount: Number(episode.viewsCount) });
  },
);

// ─── GENRES ──────────────────────────────────────────────────────────────────
router.get(
  "/catalog/genres",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listGenres(req, res, next),
);

// ─── ACTORS ──────────────────────────────────────────────────────────────────
router.get(
  "/catalog/actors",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listActors(req, res, next),
);

router.post(
  "/catalog/actors",
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
  "/catalog/actors/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateActorParams.safeParse(req.params);
    const body = UpdateActorBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res
        .status(400)
        .json({
          error: params.success ? body.error?.message : params.error.message,
        });
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

router.post(
  "/catalog/genres",
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
  "/catalog/genres/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateGenreParams.safeParse(req.params);
    const body = UpdateGenreBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res
        .status(400)
        .json({
          error: params.success ? body.error?.message : params.error.message,
        });
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
  "/catalog/genres/:id",
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
