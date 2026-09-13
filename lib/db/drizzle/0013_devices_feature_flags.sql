CREATE TABLE IF NOT EXISTS "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"telegram_id" text,
	"platform" text NOT NULL,
	"device_name" text NOT NULL,
	"device_model" text,
	"os_version" text,
	"app_version" text,
	"fcm_token" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'disabled' NOT NULL,
	"rollout_percentage" integer DEFAULT 0 NOT NULL,
	"enabled_for_user_ids" text[],
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;