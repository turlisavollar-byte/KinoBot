ALTER TABLE telegram_media ADD COLUMN IF NOT EXISTS thumbnail_key TEXT;
--> statement-breakpoint
ALTER TABLE telegram_media ADD COLUMN IF NOT EXISTS views_count BIGINT NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS telegram_media_status_uploaded_idx
  ON telegram_media (status, uploaded_at);
