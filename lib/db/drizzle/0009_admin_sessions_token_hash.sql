-- Migration to rename token column to token_hash for security
-- This changes from storing plain tokens to storing hashed tokens

-- Drop the old unique constraint on token
ALTER TABLE "admin_sessions" DROP CONSTRAINT IF EXISTS "admin_sessions_token_unique";

-- Rename the column from token to token_hash
ALTER TABLE "admin_sessions" RENAME COLUMN "token" TO "token_hash";

-- Add the new unique constraint on token_hash
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash");
