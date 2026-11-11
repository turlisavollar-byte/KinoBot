ALTER TABLE "video_codes"
  ADD COLUMN IF NOT EXISTS "movie_id" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'video_codes_movie_id_movies_id_fk'
      AND conrelid = 'public.video_codes'::regclass
  ) THEN
    ALTER TABLE "video_codes"
      ADD CONSTRAINT "video_codes_movie_id_movies_id_fk"
      FOREIGN KEY ("movie_id")
      REFERENCES "public"."movies"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "video_codes_movie_id_idx"
  ON "video_codes" ("movie_id");

CREATE INDEX IF NOT EXISTS "actors_deleted_at_idx"
  ON "actors" ("deleted_at");