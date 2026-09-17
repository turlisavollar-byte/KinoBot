ALTER TABLE "video_codes" ADD COLUMN IF NOT EXISTS "access_policy" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_codes" ADD COLUMN IF NOT EXISTS "required_channel_ids" text;