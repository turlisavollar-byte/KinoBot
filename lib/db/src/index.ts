import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export function createDbClient(connectionString: string, max = 10) {
  if (!connectionString.trim()) {
    throw new Error("Database connection string must not be empty");
  }

  if (!Number.isInteger(max) || max < 1) {
    throw new Error("Database pool max must be a positive integer");
  }

  const clientPool = new Pool({
    connectionString,
    max,
    connectionTimeoutMillis: 10_000,
  });

  clientPool.on("error", (error) => {
    console.error("Unexpected database pool error:", error);
  });

  return {
    pool: clientPool,
    db: drizzle(clientPool, { schema }),
  };
}

const primaryClient = createDbClient(databaseUrl, 10);

export const pool = primaryClient.pool;
export const db = primaryClient.db;

export * from "./schema";
