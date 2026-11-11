CREATE TABLE "telegram_media" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" bigint NOT NULL,
	"file_id" text NOT NULL,
	"file_unique_id" text NOT NULL,
	"file_name" text,
	"mime_type" text NOT NULL,
	"file_size" bigint NOT NULL,
	"duration" integer,
	"width" integer,
	"height" integer,
	"caption" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"storage_bucket" text,
	"storage_key" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_media_channel_message_uidx" ON "telegram_media" USING btree ("channel_id","message_id");
--> statement-breakpoint
CREATE INDEX "telegram_media_status_created_idx" ON "telegram_media" USING btree ("status","created_at");
