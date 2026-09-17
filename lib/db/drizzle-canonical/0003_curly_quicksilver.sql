ALTER TABLE "video_codes" ADD COLUMN "access_policy" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_codes" ADD COLUMN "required_channel_ids" text;