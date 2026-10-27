CREATE TABLE IF NOT EXISTS public.web_refresh_sessions (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  absolute_expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS web_refresh_sessions_user_active_idx
  ON public.web_refresh_sessions (user_id, revoked_at, absolute_expires_at);