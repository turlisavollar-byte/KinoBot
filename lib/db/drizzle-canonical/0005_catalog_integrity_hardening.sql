CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE UNIQUE INDEX IF NOT EXISTS "seasons_series_number_active_unique_idx"
  ON "seasons" ("series_id", "season_number")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "episodes_season_number_active_unique_idx"
  ON "episodes" ("season_id", "episode_number")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "seasons_series_active_idx"
  ON "seasons" ("series_id", "season_number")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "episodes_season_active_idx"
  ON "episodes" ("season_id", "episode_number")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "movies_catalog_idx"
  ON "movies" ("is_published", "created_at")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "series_catalog_idx"
  ON "series" ("is_published", "created_at")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "movies_title_trgm_idx"
  ON "movies" USING gin ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "series_title_trgm_idx"
  ON "series" USING gin ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "movie_genres_genre_idx"
  ON "movie_genres" ("genre_id");

CREATE INDEX IF NOT EXISTS "series_genres_genre_idx"
  ON "series_genres" ("genre_id");
