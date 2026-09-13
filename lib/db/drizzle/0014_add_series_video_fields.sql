-- Add telegram_file_id, storage_key, and source_type columns to series table
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "telegram_file_id" TEXT;
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "storage_key" TEXT;
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "source_type" TEXT NOT NULL DEFAULT 'telegram';
