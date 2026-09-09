/**
 * Search Service — DB fallback (Elasticsearch stub)
 *
 * Currently: Falls back to PostgreSQL ILIKE queries.
 * TODO: Wire in Elasticsearch from infrastructure/search/elasticsearch.ts
 */

import { ilike, or, and, sql, eq } from "drizzle-orm";
import { db, moviesTable, seriesTable, actorsTable, genresTable } from "@workspace/db";
import type { SearchQuery, SearchResponse, SearchResultItem } from "@/modules/search/search.types";

export class SearchService {
  async search(query: SearchQuery): Promise<SearchResponse> {
    const { q, types = ["movie", "series", "actor", "genre"], limit = 20, page = 1 } = query;
    const offset = (page - 1) * limit;
    const start = Date.now();
    const results: SearchResultItem[] = [];

    if (types.includes("movie")) {
      const movies = await db
        .select()
        .from(moviesTable)
        .where(
          and(
            or(ilike(moviesTable.title, `%${q}%`), ilike(moviesTable.originalTitle, `%${q}%`)),
            eq(moviesTable.isPublished, true),
            sql`${moviesTable.deletedAt} IS NULL`,
          ),
        )
        .limit(limit)
        .offset(offset);

      for (const m of movies) {
        results.push({
          id: m.id,
          type: "movie",
          title: m.title,
          description: m.description ?? undefined,
          releaseYear: m.releaseYear ?? undefined,
          rating: m.ratingAvg ? Number(m.ratingAvg) : undefined,
          score: 1.0,
        });
      }
    }

    if (types.includes("series")) {
      const series = await db
        .select()
        .from(seriesTable)
        .where(
          and(
            or(ilike(seriesTable.title, `%${q}%`), ilike(seriesTable.originalTitle, `%${q}%`)),
            eq(seriesTable.isPublished, true),
            sql`${seriesTable.deletedAt} IS NULL`,
          ),
        )
        .limit(limit)
        .offset(offset);

      for (const s of series) {
        results.push({
          id: s.id,
          type: "series",
          title: s.title,
          description: s.description ?? undefined,
          releaseYear: s.releaseYear ?? undefined,
          rating: s.ratingAvg ? Number(s.ratingAvg) : undefined,
          score: 1.0,
        });
      }
    }

    if (types.includes("actor")) {
      const actors = await db
        .select()
        .from(actorsTable)
        .where(and(ilike(actorsTable.name, `%${q}%`), sql`${actorsTable.deletedAt} IS NULL`))
        .limit(10);

      for (const a of actors) {
        results.push({ id: a.id, type: "actor", title: a.name, score: 0.8 });
      }
    }

    // Sort by score desc
    results.sort((a, b) => b.score - a.score);

    return {
      query: q,
      results: results.slice(0, limit),
      total: results.length,
      took: Date.now() - start,
    };
  }
}

export const searchService = new SearchService();
