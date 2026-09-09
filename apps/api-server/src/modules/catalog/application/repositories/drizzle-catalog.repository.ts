import { injectable } from 'tsyringe';
import { eq, ilike, and, count, sql, inArray } from 'drizzle-orm';
import {
  db,
  moviesTable,
  seriesTable,
  genresTable,
  actorsTable,
  seasonsTable,
  episodesTable,
  movieGenresTable,
  seriesGenresTable,
} from '@workspace/db';
import type { ICatalogRepository } from '../../domain/repositories/catalog.repository.interface';
import type { Movie, Series, Season, Episode, Genre, Actor } from '@workspace/db';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class DrizzleCatalogRepository implements ICatalogRepository {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance('DrizzleCatalogRepository');
  }

  // ─── MOVIES ──────────────────────────────────────────────────────────────────
  async listMovies(params: {
    page?: number;
    limit?: number;
    search?: string;
    genreId?: number;
    isPublished?: boolean;
  }) {
    const { page = 1, limit = 20, search, genreId, isPublished } = params;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [
      sql`${moviesTable.deletedAt} IS NULL` as ReturnType<typeof eq>,
    ];
    if (search) {
      conditions.push(ilike(moviesTable.title, `%${search}%`) as ReturnType<typeof eq>);
    }
    if (isPublished !== undefined) {
      conditions.push(eq(moviesTable.isPublished, isPublished));
    }
    if (genreId !== undefined) {
      const movieIds = await db
        .select({ movieId: movieGenresTable.movieId })
        .from(movieGenresTable)
        .where(eq(movieGenresTable.genreId, genreId));
      conditions.push(inArray(moviesTable.id, movieIds.map((m) => m.movieId)));
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
    let genresByMovie: Record<string, typeof genresTable.$inferSelect[]> = {};

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

    return {
      data: movies.map((m) => ({
        ...m,
        viewsCount: Number(m.viewsCount),
        ratingAvg: m.ratingAvg,
        genres: genresByMovie[m.id] ?? [],
      })) as Movie[],
      total,
      page,
      limit,
    };
  }

  async getMovieById(id: string): Promise<Movie | null> {
    const [movie] = await db.select().from(moviesTable).where(eq(moviesTable.id, id)).limit(1);
    if (!movie) return null;

    const genreRows = await db
      .select({ genre: genresTable })
      .from(movieGenresTable)
      .innerJoin(genresTable, eq(movieGenresTable.genreId, genresTable.id))
      .where(eq(movieGenresTable.movieId, id));

    return {
      ...movie,
      viewsCount: Number(movie.viewsCount),
      ratingAvg: movie.ratingAvg,
      genres: genreRows.map((r) => r.genre),
    } as Movie;
  }

  async createMovie(data: Omit<Movie, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { genreIds?: number[] }): Promise<Movie> {
    const { genreIds, ...movieData } = data;

    const [movie] = await db.insert(moviesTable).values(movieData).returning();

    if (genreIds && genreIds.length > 0) {
      await db.insert(movieGenresTable).values(
        genreIds.map((gid) => ({ movieId: movie.id, genreId: gid })),
      );
    }

    return this.getMovieById(movie.id) as Promise<Movie>;
  }

  async updateMovie(id: string, data: Partial<Movie> & { genreIds?: number[] }): Promise<Movie> {
    const { genreIds, ...updateData } = data;

    await db.update(moviesTable).set(updateData).where(eq(moviesTable.id, id));

    if (genreIds !== undefined) {
      await db.delete(movieGenresTable).where(eq(movieGenresTable.movieId, id));
      if (genreIds.length > 0) {
        await db.insert(movieGenresTable).values(
          genreIds.map((gid) => ({ movieId: id, genreId: gid })),
        );
      }
    }

    return this.getMovieById(id) as Promise<Movie>;
  }

  async deleteMovie(id: string): Promise<void> {
    await db.update(moviesTable).set({ deletedAt: new Date() }).where(eq(moviesTable.id, id));
  }

  async publishMovie(id: string, published: boolean): Promise<Movie> {
    await db.update(moviesTable).set({ isPublished: published }).where(eq(moviesTable.id, id));
    return this.getMovieById(id) as Promise<Movie>;
  }

  // ─── SERIES ──────────────────────────────────────────────────────────────────
  async listSeries(params: {
    page?: number;
    limit?: number;
    search?: string;
    isPublished?: boolean;
  }) {
    const { page = 1, limit = 20, search, isPublished } = params;
    const offset = (page - 1) * limit;

    const conditions = [sql`${seriesTable.deletedAt} IS NULL`];
    if (search) conditions.push(ilike(seriesTable.title, `%${search}%`));
    if (isPublished !== undefined) conditions.push(eq(seriesTable.isPublished, isPublished));
    const whereClause = and(...conditions as ReturnType<typeof eq>[]);

    const [{ total }] = await db.select({ total: count() }).from(seriesTable).where(whereClause);
    const items = await db.select().from(seriesTable).where(whereClause)
      .orderBy(seriesTable.createdAt).limit(limit).offset(offset);

    const ids = items.map((s) => s.id);
    const genreRows = ids.length
      ? await db.select({ seriesId: seriesGenresTable.seriesId, genre: genresTable })
          .from(seriesGenresTable)
          .innerJoin(genresTable, eq(seriesGenresTable.genreId, genresTable.id))
          .where(inArray(seriesGenresTable.seriesId, ids))
      : [];

    const byId: Record<string, typeof genresTable.$inferSelect[]> = {};
    for (const r of genreRows) {
      if (!byId[r.seriesId]) byId[r.seriesId] = [];
      byId[r.seriesId].push(r.genre);
    }

    return {
      data: items.map((s) => ({
        ...s,
        viewsCount: Number(s.viewsCount),
        ratingAvg: s.ratingAvg,
        genres: byId[s.id] ?? [],
      })) as Series[],
      total, page, limit,
    };
  }

  async getSeriesById(id: string): Promise<Series | null> {
    const [series] = await db.select().from(seriesTable).where(eq(seriesTable.id, id)).limit(1);
    if (!series) return null;

    const genreRows = await db
      .select({ genre: genresTable })
      .from(seriesGenresTable)
      .innerJoin(genresTable, eq(seriesGenresTable.genreId, genresTable.id))
      .where(eq(seriesGenresTable.seriesId, id));

    return {
      ...series,
      viewsCount: Number(series.viewsCount),
      ratingAvg: series.ratingAvg,
      genres: genreRows.map((r) => r.genre),
    } as Series;
  }

  async createSeries(data: Omit<Series, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { genreIds?: number[] }): Promise<Series> {
    const { genreIds, ...seriesData } = data;
    const [series] = await db.insert(seriesTable).values(seriesData).returning();
    if (genreIds?.length) {
      await db.insert(seriesGenresTable).values(genreIds.map((gid) => ({ seriesId: series.id, genreId: gid })));
    }
    return this.getSeriesById(series.id) as Promise<Series>;
  }

  async updateSeries(id: string, data: Partial<Series> & { genreIds?: number[] }): Promise<Series> {
    const { genreIds, ...updateData } = data;
    await db.update(seriesTable).set(updateData).where(eq(seriesTable.id, id));
    if (genreIds !== undefined) {
      await db.delete(seriesGenresTable).where(eq(seriesGenresTable.seriesId, id));
      if (genreIds.length > 0)
        await db.insert(seriesGenresTable).values(genreIds.map((gid) => ({ seriesId: id, genreId: gid })));
    }
    return this.getSeriesById(id) as Promise<Series>;
  }

  async deleteSeries(id: string): Promise<void> {
    await db.update(seriesTable).set({ deletedAt: new Date() }).where(eq(seriesTable.id, id));
  }

  async publishSeries(id: string, published: boolean): Promise<Series> {
    await db.update(seriesTable).set({ isPublished: published }).where(eq(seriesTable.id, id));
    return this.getSeriesById(id) as Promise<Series>;
  }

  // ─── SEASONS ──────────────────────────────────────────────────────────────────
  async listSeasons(seriesId: string): Promise<Season[]> {
    return await db.select().from(seasonsTable)
      .where(and(eq(seasonsTable.seriesId, seriesId), sql`${seasonsTable.deletedAt} IS NULL`))
      .orderBy(seasonsTable.seasonNumber);
  }

  async createSeason(seriesId: string, data: Omit<Season, 'id' | 'createdAt' | 'deletedAt'>): Promise<Season> {
    const [season] = await db.insert(seasonsTable).values({ ...data, seriesId }).returning();
    return season;
  }

  async updateSeason(id: string, data: Partial<Season>): Promise<Season> {
    const [season] = await db.update(seasonsTable).set(data).where(eq(seasonsTable.id, id)).returning();
    return season;
  }

  async deleteSeason(id: string): Promise<void> {
    await db.update(seasonsTable).set({ deletedAt: new Date() }).where(eq(seasonsTable.id, id));
  }

  // ─── EPISODES ─────────────────────────────────────────────────────────────────
  async listEpisodes(seasonId: string): Promise<Episode[]> {
    const episodes = await db.select().from(episodesTable)
      .where(and(eq(episodesTable.seasonId, seasonId), sql`${episodesTable.deletedAt} IS NULL`))
      .orderBy(episodesTable.episodeNumber);
    return episodes.map((e) => ({ ...e, viewsCount: Number(e.viewsCount) })) as Episode[];
  }

  async createEpisode(seasonId: string, data: Omit<Episode, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Episode> {
    const [ep] = await db.insert(episodesTable).values({ ...data, seasonId }).returning();
    return { ...ep, viewsCount: Number(ep.viewsCount) } as Episode;
  }

  async updateEpisode(id: string, data: Partial<Episode>): Promise<Episode> {
    const [ep] = await db.update(episodesTable).set(data).where(eq(episodesTable.id, id)).returning();
    return { ...ep, viewsCount: Number(ep.viewsCount) } as Episode;
  }

  async deleteEpisode(id: string): Promise<void> {
    await db.update(episodesTable).set({ deletedAt: new Date() }).where(eq(episodesTable.id, id));
  }

  async publishEpisode(id: string, published: boolean): Promise<Episode> {
    const [ep] = await db.update(episodesTable).set({ isPublished: published }).where(eq(episodesTable.id, id)).returning();
    return { ...ep, viewsCount: Number(ep.viewsCount) } as Episode;
  }

  // ─── GENRES ──────────────────────────────────────────────────────────────────
  async listGenres(): Promise<Genre[]> {
    return await db.select().from(genresTable).where(sql`${genresTable.deletedAt} IS NULL`).orderBy(genresTable.name);
  }

  async getGenreById(id: number): Promise<Genre | null> {
    const [genre] = await db.select().from(genresTable).where(eq(genresTable.id, id)).limit(1);
    return genre || null;
  }

  async createGenre(data: Omit<Genre, 'id' | 'deletedAt'>): Promise<Genre> {
    const [genre] = await db.insert(genresTable).values(data).returning();
    return genre;
  }

  async updateGenre(id: number, data: Partial<Genre>): Promise<Genre> {
    const [genre] = await db.update(genresTable).set(data).where(eq(genresTable.id, id)).returning();
    return genre;
  }

  async deleteGenre(id: number): Promise<void> {
    await db.update(genresTable).set({ deletedAt: new Date() }).where(eq(genresTable.id, id));
  }

  // ─── ACTORS ───────────────────────────────────────────────────────────────────
  async listActors(params: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { page = 1, limit = 20, search } = params;
    const offset = (page - 1) * limit;
    const conditions = [sql`${actorsTable.deletedAt} IS NULL`];
    if (search) conditions.push(ilike(actorsTable.name, `%${search}%`));
    const whereClause = and(...conditions as ReturnType<typeof eq>[]);
    const [{ total }] = await db.select({ total: count() }).from(actorsTable).where(whereClause);
    const actors = await db.select().from(actorsTable).where(whereClause).orderBy(actorsTable.name).limit(limit).offset(offset);
    return { data: actors, total, page, limit };
  }

  async getActorById(id: string): Promise<Actor | null> {
    const [actor] = await db.select().from(actorsTable).where(eq(actorsTable.id, id)).limit(1);
    return actor || null;
  }

  async createActor(data: Omit<Actor, 'id' | 'deletedAt'>): Promise<Actor> {
    const [actor] = await db.insert(actorsTable).values(data).returning();
    return actor;
  }

  async updateActor(id: string, data: Partial<Actor>): Promise<Actor> {
    const [actor] = await db.update(actorsTable).set(data).where(eq(actorsTable.id, id)).returning();
    return actor;
  }

  async deleteActor(id: string): Promise<void> {
    await db.update(actorsTable).set({ deletedAt: new Date() }).where(eq(actorsTable.id, id));
  }
}
