CREATE TABLE "audit_log_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"audit_log_id" text NOT NULL,
	"tag" varchar(50) NOT NULL,
	"value" varchar(255),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" varchar(255),
	"actor_type" varchar(50) NOT NULL,
	"actor_email" varchar(255),
	"actor_ip" varchar(45),
	"actor_user_agent" text,
	"action" varchar(50) NOT NULL,
	"action_category" varchar(50),
	"target_type" varchar(50) NOT NULL,
	"target_id" varchar(255),
	"target_name" varchar(255),
	"old_value" jsonb,
	"new_value" jsonb,
	"diff" jsonb,
	"snapshot_before" jsonb,
	"snapshot_after" jsonb,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_id" varchar(255),
	"session_id" varchar(255),
	"correlation_id" varchar(255),
	"environment" varchar(20),
	"service_name" varchar(100),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"retention_days" integer DEFAULT 90,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"idempotency_key" text,
	"user_id" text NOT NULL,
	"subscription_id" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text NOT NULL,
	"due_date" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoices_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "billing_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"invoice_id" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text NOT NULL,
	"provider" text NOT NULL,
	"provider_payment_id" text,
	"failure_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"interval" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payme_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"paycom_id" text NOT NULL,
	"paycom_time" text NOT NULL,
	"paycom_time_perform" text,
	"paycom_time_cancel" text,
	"reason" integer,
	"state" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payme_transactions_paycom_id_unique" UNIQUE("paycom_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'UZS' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text NOT NULL,
	"provider_transaction_id" text,
	"idempotency_key" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "actors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"photo_url" text,
	"biography" text,
	"birth_date" timestamp with time zone,
	"birth_place" text,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"season_id" text NOT NULL,
	"episode_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration" integer,
	"telegram_file_id" text,
	"storage_key" text,
	"source_type" text DEFAULT 'telegram' NOT NULL,
	"thumbnail_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"views_count" bigint DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "genres_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "genres_name_unique" UNIQUE("name"),
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "movie_actors" (
	"movie_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"role" text,
	CONSTRAINT "movie_actors_movie_id_actor_id_pk" PRIMARY KEY("movie_id","actor_id")
);
--> statement-breakpoint
CREATE TABLE "movie_genres" (
	"movie_id" text NOT NULL,
	"genre_id" integer NOT NULL,
	CONSTRAINT "movie_genres_movie_id_genre_id_pk" PRIMARY KEY("movie_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"original_title" text,
	"description" text,
	"release_year" integer,
	"duration" integer,
	"age_rating" text,
	"poster_url" text,
	"background_url" text,
	"trailer_url" text,
	"telegram_file_id" text,
	"storage_key" text,
	"source_type" text DEFAULT 'telegram' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"views_count" bigint DEFAULT 0 NOT NULL,
	"rating_avg" numeric(3, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" text PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"season_number" integer NOT NULL,
	"title" text,
	"episodes_count" integer DEFAULT 0 NOT NULL,
	"poster_url" text,
	"release_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "series_genres" (
	"series_id" text NOT NULL,
	"genre_id" integer NOT NULL,
	CONSTRAINT "series_genres_series_id_genre_id_pk" PRIMARY KEY("series_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"original_title" text,
	"description" text,
	"release_year" integer,
	"age_rating" text,
	"poster_url" text,
	"background_url" text,
	"trailer_url" text,
	"telegram_file_id" text,
	"storage_key" text,
	"source_type" text DEFAULT 'telegram' NOT NULL,
	"seasons_count" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"views_count" bigint DEFAULT 0 NOT NULL,
	"rating_avg" numeric(3, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "video_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"telegram_file_id" text,
	"channel_id" text,
	"message_id" bigint,
	"file_size" bigint,
	"duration" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"views_count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "devices" (
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
CREATE TABLE "feature_flags" (
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
CREATE TABLE "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"device" text,
	"ip" text,
	"user_agent" text,
	"session_name" text,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"role_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"last_failed_login_at" timestamp with time zone,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"verification_token" text,
	"verification_expires_at" timestamp with time zone,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"reset_token" text,
	"reset_expires_at" timestamp with time zone,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"avatar" text,
	"cover_image" text,
	"location" text,
	"website" text,
	"birth_date" timestamp with time zone,
	"gender" text,
	"preferences" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"total_watch_time" integer DEFAULT 0 NOT NULL,
	"total_watch_sessions" integer DEFAULT 0 NOT NULL,
	"total_movies_watched" integer DEFAULT 0 NOT NULL,
	"total_series_watched" integer DEFAULT 0 NOT NULL,
	"total_episodes_watched" integer DEFAULT 0 NOT NULL,
	"total_favorites" integer DEFAULT 0 NOT NULL,
	"total_ratings" integer DEFAULT 0 NOT NULL,
	"average_rating" integer DEFAULT 0 NOT NULL,
	"last_watch_date" timestamp with time zone,
	"active_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"total_subscriptions" integer DEFAULT 0 NOT NULL,
	"active_subscription_count" integer DEFAULT 0 NOT NULL,
	"total_referrals" integer DEFAULT 0 NOT NULL,
	"referral_rewards" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"telegram_id" text NOT NULL,
	"email" text,
	"phone" text,
	"username" text,
	"first_name" text,
	"last_name" text,
	"language_code" text DEFAULT 'en' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"blocked_reason" text,
	"last_login_at" timestamp with time zone,
	"referral_code" text,
	"referred_by" text,
	"referral_reward_tier" integer DEFAULT 0 NOT NULL,
	"acquisition_source" text,
	"daily_code_limit" integer,
	"daily_code_used" integer DEFAULT 0 NOT NULL,
	"daily_code_reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"weekly_code_limit" integer,
	"weekly_code_used" integer DEFAULT 0 NOT NULL,
	"weekly_code_reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"monthly_code_limit" integer,
	"monthly_code_used" integer DEFAULT 0 NOT NULL,
	"monthly_code_reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trial_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'UZS' NOT NULL,
	"duration_days" integer NOT NULL,
	"max_devices" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'storage' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"files_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "telegram_channels_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_config" (
	"id" text PRIMARY KEY NOT NULL,
	"bot_token" text,
	"bot_username" text,
	"default_channel_id" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"webhook_url" text,
	"required_channel_id" text,
	"default_daily_code_limit" integer,
	"default_weekly_code_limit" integer,
	"default_monthly_code_limit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message_id" bigint,
	"chat_id" text NOT NULL,
	"text" text,
	"type" text DEFAULT 'text' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"target_audience" text DEFAULT 'all' NOT NULL,
	"variables" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"content" text NOT NULL,
	"content_type" text DEFAULT 'text' NOT NULL,
	"media_file_id" text,
	"parse_mode" text DEFAULT 'HTML' NOT NULL,
	"buttons" jsonb,
	"variables" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content_id" text NOT NULL,
	"content_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "favorites_user_id_content_id_content_type_unique" UNIQUE("user_id","content_id","content_type")
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content_id" text NOT NULL,
	"content_type" text NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_user_id_content_id_content_type_unique" UNIQUE("user_id","content_id","content_type")
);
--> statement-breakpoint
CREATE TABLE "watch_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content_id" text NOT NULL,
	"content_type" text NOT NULL,
	"progress_seconds" integer DEFAULT 0 NOT NULL,
	"completed_percent" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watch_progress_user_id_content_id_content_type_unique" UNIQUE("user_id","content_id","content_type")
);
--> statement-breakpoint
CREATE TABLE "watch_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content_id" text NOT NULL,
	"content_type" text NOT NULL,
	"duration_watched" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"resource" text,
	"action" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "audit_log_tags" ADD CONSTRAINT "audit_log_tags_audit_log_id_audit_logs_id_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_subscription_id_billing_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_invoice_id_billing_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."billing_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_plan_id_billing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payme_transactions" ADD CONSTRAINT "payme_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_actors" ADD CONSTRAINT "movie_actors_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_actors" ADD CONSTRAINT "movie_actors_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_genres" ADD CONSTRAINT "series_genres_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_genres" ADD CONSTRAINT "series_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_jobs" ADD CONSTRAINT "broadcast_jobs_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_sessions" ADD CONSTRAINT "watch_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_tags_log_idx" ON "audit_log_tags" USING btree ("audit_log_id");--> statement-breakpoint
CREATE INDEX "audit_log_tags_tag_idx" ON "audit_log_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "audit_log_tags_unique_idx" ON "audit_log_tags" USING btree ("audit_log_id","tag");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id","actor_type");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action","action_category");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_request_idx" ON "audit_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_time_idx" ON "audit_logs" USING btree ("actor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_target_time_idx" ON "audit_logs" USING btree ("target_type","target_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_retention_idx" ON "audit_logs" USING btree ("created_at") WHERE "audit_logs"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "audit_logs_compliance_idx" ON "audit_logs" USING btree ("action","actor_type","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "billing_outbox_pending_idx" ON "billing_outbox" USING btree ("status","available_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_payments_provider_payment_id_unique" ON "billing_payments" USING btree ("provider","provider_payment_id");