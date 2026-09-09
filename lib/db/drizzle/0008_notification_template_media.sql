ALTER TABLE "notification_templates" ADD COLUMN IF NOT EXISTS "content_type" text NOT NULL DEFAULT 'text';
ALTER TABLE "notification_templates" ADD COLUMN IF NOT EXISTS "media_file_id" text;
ALTER TABLE "notification_templates" ADD COLUMN IF NOT EXISTS "parse_mode" text NOT NULL DEFAULT 'HTML';
ALTER TABLE "notification_templates" ADD COLUMN IF NOT EXISTS "buttons" jsonb;