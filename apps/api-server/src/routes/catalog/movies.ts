import { Router, type IRouter } from "express";
import { eq, ilike, and, count, sql, inArray } from "drizzle-orm";
import { db, moviesTable, genresTable, movieGenresTable } from "@workspace/db";
import {
  ListMoviesQueryParams,
  GetMovieParams,
  CreateMovieBody,
  UpdateMovieParams,
  UpdateMovieBody,
  DeleteMovieParams,
  PublishMovieParams,
  PublishMovieBody,
} from "@workspace/api-zod";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";

const router: IRouter = Router();
router.use(requireAuth);

async function getMovieWithGenres(id: string) {
  const [movie] = await db
    .select()
    .from(moviesTable)
    .where(eq(moviesTable.id, id))
    .limit(1);
  if (!movie) return null;

  const genreRows = await db
    .select({ genre: genresTable })
    .from(movieGenresTable)
    .innerJoin(genresTable, eq(movieGenresTable.genreId, genresTable.id))
    .where(eq(movieGenresTable.movieId, id));

  return {
    ...movie,
    viewsCount: Number(movie.viewsCount),
    ratingAvg: parseFloat(movie.ratingAvg ?? "0"),
    genres: genreRows.map((r) => r.genre),
  };
}

router.get(
  "/catalog/movies",
  requirePermission(Permission.READ_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = ListMoviesQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { page = 1, limit = 20, search } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [
      sql`${moviesTable.deletedAt} IS NULL` as ReturnType<typeof eq>,
    ];
    if (search) {
      conditions.push(
        ilike(moviesTable.title, `%${search}%`) as ReturnType<typeof eq>,
      );
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(moviesTable)
      .where(whereClause);

    const movies = await db
      .select()
      .from(moviesTable)
      .where(whereClause)
      .orderBy(moviesTable.createdAt)
      .limit(limit)
      .offset(offset);

    const movieIds = movies.map((m) => m.id);
    let genresByMovie: Record<string, (typeof genresTable.$inferSelect)[]> = {};

    if (movieIds.length > 0) {
      const genreRows = await db
        .select({ movieId: movieGenresTable.movieId, genre: genresTable })
        .from(movieGenresTable)
        .innerJoin(genresTable, eq(movieGenresTable.genreId, genresTable.id))
        .where(inArray(movieGenresTable.movieId, movieIds));

      for (const row of genreRows) {
        if (!genresByMovie[row.movieId]) genresByMovie[row.movieId] = [];
        genresByMovie[row.movieId].push(row.genre);
      }
    }

    res.json({
      data: movies.map((m) => ({
        ...m,
        viewsCount: Number(m.viewsCount),
        ratingAvg: parseFloat(m.ratingAvg ?? "0"),
        genres: genresByMovie[m.id] ?? [],
      })),
      total,
      page,
      limit,
    });
  },
);

router.post(
  "/catalog/movies",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = CreateMovieBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const movieData = parsed.data;

    const [movie] = await db.insert(moviesTable).values(movieData).returning();

    const result = await getMovieWithGenres(movie.id);
    res.status(201).json(result);
  },
);

router.get(
  "/catalog/movies/:id",
  requirePermission(Permission.READ_CONTENT),
  async (req, res): Promise<void> => {
    const params = GetMovieParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const movie = await getMovieWithGenres(params.data.id);
    if (!movie) {
      res.status(404).json({ error: "Movie not found" });
      return;
    }

    res.json(movie);
  },
);

router.patch(
  "/catalog/movies/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateMovieParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UpdateMovieBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const updateData = body.data;

    await db
      .update(moviesTable)
      .set(updateData)
      .where(eq(moviesTable.id, params.data.id));

    const movie = await getMovieWithGenres(params.data.id);
    if (!movie) {
      res.status(404).json({ error: "Movie not found" });
      return;
    }

    res.json(movie);
  },
);

router.delete(
  "/catalog/movies/:id",
  requirePermission(Permission.DELETE_CONTENT),
  async (req, res): Promise<void> => {
    const params = DeleteMovieParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    await db
      .update(moviesTable)
      .set({ deletedAt: new Date() })
      .where(eq(moviesTable.id, params.data.id));

    res.sendStatus(204);
  },
);

router.post(
  "/catalog/movies/:id/publish",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = PublishMovieParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = PublishMovieBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    await db
      .update(moviesTable)
      .set({ isPublished: body.data.published })
      .where(eq(moviesTable.id, params.data.id));

    const movie = await getMovieWithGenres(params.data.id);
    if (!movie) {
      res.status(404).json({ error: "Movie not found" });
      return;
    }

    res.json(movie);
  },
);

export default router;
