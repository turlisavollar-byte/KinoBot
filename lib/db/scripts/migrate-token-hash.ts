import { config } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";

// Load .env from the parent directory
config({
  path: resolve(process.cwd(), "../../.env"),
});

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

async function migrate() {
  try {
    console.log("Starting migration: admin_sessions token -> token_hash");
    
    await pool.query(`
      -- Drop the old unique constraint on token
      ALTER TABLE "admin_sessions" DROP CONSTRAINT IF EXISTS "admin_sessions_token_unique";
    `);
    console.log("Dropped old unique constraint");
    
    await pool.query(`
      -- Rename the column from token to token_hash
      ALTER TABLE "admin_sessions" RENAME COLUMN "token" TO "token_hash";
    `);
    console.log("Renamed column from token to token_hash");
    
    await pool.query(`
      -- Add the new unique constraint on token_hash
      ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash");
    `);
    console.log("Added new unique constraint on token_hash");
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);
