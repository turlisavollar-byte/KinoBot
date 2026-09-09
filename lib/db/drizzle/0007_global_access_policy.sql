ALTER TABLE "telegram_config" ADD COLUMN IF NOT EXISTS "default_daily_code_limit" integer;
ALTER TABLE "telegram_config" ADD COLUMN IF NOT EXISTS "default_weekly_code_limit" integer;
ALTER TABLE "telegram_config" ADD COLUMN IF NOT EXISTS "default_monthly_code_limit" integer;