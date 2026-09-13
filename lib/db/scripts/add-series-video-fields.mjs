import { config } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";

config({
  path: resolve(process.cwd(), ".env"),
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined. Check the root .env file.");
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  console.log("Adding telegram_file_id, storage_key, and source_type columns to series table...");
  
  try {
    await client.connect();
    
    await client.query(`
      ALTER TABLE "series" 
      ADD COLUMN IF NOT EXISTS "telegram_file_id" TEXT,
      ADD COLUMN IF NOT EXISTS "storage_key" TEXT,
      ADD COLUMN IF NOT EXISTS "source_type" TEXT NOT NULL DEFAULT 'telegram';
    `);
    
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
