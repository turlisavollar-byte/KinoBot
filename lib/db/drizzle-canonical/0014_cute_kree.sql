CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "system_settings" ("key", "value")
VALUES ('trial_duration_days', '30')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.system_settings TO kinobot_user;