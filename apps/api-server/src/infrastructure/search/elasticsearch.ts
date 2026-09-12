/**
 * Search client using Elasticsearch
 *
 * Planned indices:
 *   - movies (title, description, genres, actors)
 *   - series (title, description, genres, actors)
 *   - users (username, firstName, lastName)
 */

import { Client } from "@elastic/elasticsearch";
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
  createIndex(indexName: string, mapping?: Record<string, unknown>): Promise<void>;
  deleteIndex(indexName: string): Promise<void>;
}

class ElasticsearchClient implements SearchClient {
  private client: Client;

  constructor() {
    const elasticsearchUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
    this.client = new Client({
      node: elasticsearchUrl,
    });

    this.checkConnection();
  }

  private async checkConnection(): Promise<void> {
    try {
      await this.client.ping();
      logger.info("Elasticsearch connected successfully");
    } catch (error) {
      logger.error("Elasticsearch connection failed:", undefined, error);
    }
  }

  async index<T>(indexName: string, id: string, doc: T): Promise<void> {
    try {
      await this.client.index({
        index: indexName,
        id,
        document: doc,
      });
      logger.debug(`Document indexed in ${indexName}: ${id}`);
    } catch (error) {
      logger.error(`Failed to index document in ${indexName}:`, undefined, error);
      throw error;
    }
  }

  async search<T>(
    indexName: string,
    query: string,
    opts?: { size?: number; from?: number }
  ): Promise<SearchResult<T>> {
    try {
      const response = await this.client.search({
        index: indexName,
        query: {
          multi_match: {
            query,
            fields: ["*"],
            fuzziness: "AUTO",
          },
        },
        size: opts?.size || 10,
        from: opts?.from || 0,
      });

      const hits = response.hits.hits.map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        source: hit._source as T,
      }));

      return {
        hits,
        total: typeof response.hits.total === "number" ? response.hits.total : response.hits.total?.value || 0,
        took: response.took,
      };
    } catch (error) {
      logger.error(`Failed to search in ${indexName}:`, undefined, error);
      return { hits: [], total: 0, took: 0 };
    }
  }

  async delete(indexName: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index: indexName,
        id,
      });
      logger.debug(`Document deleted from ${indexName}: ${id}`);
    } catch (error) {
      logger.error(`Failed to delete document from ${indexName}:`, undefined, error);
      throw error;
    }
  }

  async createIndex(indexName: string, mapping?: Record<string, unknown>): Promise<void> {
    try {
      await this.client.indices.create({
        index: indexName,
        body: {
          mapping,
        },
      });
      logger.info(`Index created: ${indexName}`);
    } catch (error: any) {
      if (error.meta?.statusCode === 400 && error.message?.includes("resource_already_exists")) {
        logger.warn(`Index already exists: ${indexName}`);
      } else {
        logger.error(`Failed to create index ${indexName}:`, undefined, error);
        throw error;
      }
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    try {
      await this.client.indices.delete({
        index: indexName,
      });
      logger.info(`Index deleted: ${indexName}`);
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        logger.warn(`Index not found: ${indexName}`);
      } else {
        logger.error(`Failed to delete index ${indexName}:`, undefined, error);
        throw error;
      }
    }
  }
}

class StubSearch implements SearchClient {
  async index<T>(_index: string, _id: string, _doc: T): Promise<void> {
    logger.debug("Search: Elasticsearch not configured, indexing skipped");
  }
  async search<T>(_index: string, _query: string): Promise<SearchResult<T>> {
    return { hits: [], total: 0, took: 0 };
  }
  async delete(_index: string, _id: string): Promise<void> {}
  async createIndex(_index: string, _mapping?: Record<string, unknown>): Promise<void> {}
  async deleteIndex(_index: string): Promise<void> {}
}

export const searchClient: SearchClient = process.env.ELASTICSEARCH_URL
  ? new ElasticsearchClient()
  : new StubSearch();

if (process.env.ELASTICSEARCH_URL) {
  logger.info("Search: using Elasticsearch");
} else {
  logger.info("Search: using stub (no ELASTICSEARCH_URL configured)");
}

export const SearchIndex = {
  MOVIES: "movies",
  SERIES: "series",
  USERS: "users",
} as const;
