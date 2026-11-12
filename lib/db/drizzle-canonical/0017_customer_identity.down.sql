DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_identities) THEN
    RAISE EXCEPTION 'Cannot roll back customer identities while identity rows exist'
      USING ERRCODE = '55000';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users WHERE merged_into IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot roll back merged_into while merge pointers exist'
      USING ERRCODE = '55000';
  END IF;
END
$$;
--> statement-breakpoint
DROP TABLE IF EXISTS public.user_identities;
--> statement-breakpoint
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_merged_into_not_self_check;
--> statement-breakpoint
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_merged_into_users_id_fk;
--> statement-breakpoint
DROP INDEX IF EXISTS public.users_merged_into_idx;
--> statement-breakpoint
ALTER TABLE public.users
  DROP COLUMN IF EXISTS merged_into;
