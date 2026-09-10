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
    console.log("Starting migration: security enhancements");
    
    // Add security columns to admin_users table
    console.log("Adding security columns to admin_users table...");

    await pool.query(
      'ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "last_failed_login_at" TIMESTAMP WITH TIME ZONE;'
    );
    console.log("Added last_failed_login_at column");

    await pool.query(
      'ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "failed_login_count" INTEGER NOT NULL DEFAULT 0;'
    );
    console.log("Added failed_login_count column");

    await pool.query(
      'ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP WITH TIME ZONE;'
    );
    console.log("Added locked_until column");

    // Add session management columns to admin_sessions table
    console.log("Adding session management columns to admin_sessions table...");

    await pool.query(
      'ALTER TABLE "admin_sessions" ADD COLUMN IF NOT EXISTS "device" TEXT;'
    );
    console.log("Added device column");

    await pool.query(
      'ALTER TABLE "admin_sessions" ADD COLUMN IF NOT EXISTS "ip" TEXT;'
    );
    console.log("Added ip column");

    await pool.query(
      'ALTER TABLE "admin_sessions" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;'
    );
    console.log("Added user_agent column");

    await pool.query(
      'ALTER TABLE "admin_sessions" ADD COLUMN IF NOT EXISTS "session_name" TEXT;'
    );
    console.log("Added session_name column");

    await pool.query(
      'ALTER TABLE "admin_sessions" ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP WITH TIME ZONE;'
    );
    console.log("Added last_used_at column");

    // Create indexes
    console.log("Creating indexes...");

    await pool.query(
      'CREATE INDEX IF NOT EXISTS "idx_admin_users_locked_until" ON "admin_users"("locked_until") WHERE "locked_until" IS NOT NULL;'
    );
    console.log("Created idx_admin_users_locked_until index");

    await pool.query(
      'CREATE INDEX IF NOT EXISTS "idx_admin_sessions_last_used_at" ON "admin_sessions"("last_used_at");'
    );
    console.log("Created idx_admin_sessions_last_used_at index");
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);
