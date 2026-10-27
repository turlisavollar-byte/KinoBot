ALTER TABLE public.users
  ALTER COLUMN telegram_id DROP NOT NULL;
--> statement-breakpoint

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash text;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT lower(email)
    FROM public.users
    WHERE email IS NOT NULL
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add Web customer auth: duplicate emails differ only by case';
  END IF;
END
$$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS users_email_case_insensitive_unique_idx
  ON public.users (lower(email))
  WHERE email IS NOT NULL;