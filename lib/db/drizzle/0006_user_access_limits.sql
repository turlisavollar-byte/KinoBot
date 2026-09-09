ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "weekly_code_limit" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "weekly_code_used" integer NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "weekly_code_reset_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "monthly_code_limit" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "monthly_code_used" integer NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "monthly_code_reset_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_expires_at" timestamp with time zone;