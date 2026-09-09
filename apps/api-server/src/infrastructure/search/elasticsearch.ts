/**
 * Search client — STUB
 *
 * TODO: Install @elastic/elasticsearch and configure Elasticsearch.
 *   pnpm --filter @workspace/api-server add @elastic/elasticsearch
 *   Set ELASTICSEARCH_URL env var.
 *
 * Planned indices:
 *   - movies (title, description, genres, actors)
 *   - series (title, description, genres, actors)
 *   - users (username, firstName, lastName)
 */

import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("Elasticsearch");

export interface SearchHit<T = unknown> {
  id: string;
  score: number;
  source: T;
}

export interface SearchResult<T = unknown> {
  hits: SearchHit<T>[];
  total: number;
  took: number;
}

export interface SearchClient {
  index<T>(indexName: string, id: string, doc: T): Promise<void>;
  search<T>(indexName: string, query: string, opts?: { size?: number; from?: number }): Promise<SearchResult<T>>;
  delete(indexName: string, id: string): Promise<void>;
}

class StubSearch implements SearchClient {
  async index<T>(_index: string, _id: string, _doc: T): Promise<void> {
    logger.debug("Search: Elasticsearch not configured, indexing skipped");
  }
  async search<T>(_index: string, _query: string): Promise<SearchResult<T>> {
    return { hits: [], total: 0, took: 0 };
  }
  async delete(_index: string, _id: string): Promise<void> {}
}

export const searchClient: SearchClient = new StubSearch();

export const SearchIndex = {
  MOVIES: "movies",
  SERIES: "series",
  USERS: "users",
} as const;
