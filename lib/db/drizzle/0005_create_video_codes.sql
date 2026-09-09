CREATE TABLE IF NOT EXISTS "video_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"description" text,
	"telegram_file_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" bigint,
	"file_size" bigint,
	"duration" integer,
	"status" text NOT NULL DEFAULT 'pending',
	"views_count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
