-- Migration to add enterprise security features
-- Adds account lockout, failed login tracking, and session management enhancements

-- Add security columns to admin_users table
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "last_failed_login_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "failed_login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP WITH TIME ZONE;

-- Add session management columns to admin_sessions table
ALTER TABLE "admin_sessions" ADD COLUMN IF NOT EXISTS "device" TEXT;
ALTER TABLE "admin_sessions" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "admin_sessions" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
ALTER TABLE "admin_sessions" ADD COLUMN IF NOT EXISTS "session_name" TEXT;
ALTER TABLE "admin_sessions" ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP WITH TIME ZONE;

-- Create index on locked_until for efficient querying of locked accounts
CREATE INDEX IF NOT EXISTS "idx_admin_users_locked_until" ON "admin_users"("locked_until") WHERE "locked_until" IS NOT NULL;

-- Create index on last_used_at for session cleanup
CREATE INDEX IF NOT EXISTS "idx_admin_sessions_last_used_at" ON "admin_sessions"("last_used_at");
