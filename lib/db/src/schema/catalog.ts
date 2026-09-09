import {
  pgTable,
  text,
  boolean,
  integer,
  bigint,
  numeric,
  timestamp,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── GENRES ─────────────────────────────────────────────────────────────────
export const genresTable = pgTable("genres", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ─── ACTORS ──────────────────────────────────────────────────────────────────
export const actorsTable = pgTable("actors", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  biography: text("biography"),
  birthDate: timestamp("birth_date", { withTimezone: true }),
  birthPlace: text("birth_place"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ─── MOVIES ──────────────────────────────────────────────────────────────────
export const moviesTable = pgTable("movies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  originalTitle: text("original_title"),
  description: text("description"),
  releaseYear: integer("release_year"),
  duration: integer("duration"),
  ageRating: text("age_rating"),
  posterUrl: text("poster_url"),
  backgroundUrl: text("background_url"),
  trailerUrl: text("trailer_url"),
  telegramFileId: text("telegram_file_id"),
  storageKey: text("storage_key"),
  sourceType: text("source_type").notNull().default("telegram"),
  isPublished: boolean("is_published").notNull().default(false),
  viewsCount: bigint("views_count", { mode: "number" }).notNull().default(0),
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const movieGenresTable = pgTable("movie_genres", {
  movieId: text("movie_id").notNull().references(() => moviesTable.id),
  genreId: integer("genre_id").notNull().references(() => genresTable.id),
}, (t) => [primaryKey({ columns: [t.movieId, t.genreId] })]);

export const movieActorsTable = pgTable("movie_actors", {
  movieId: text("movie_id").notNull().references(() => moviesTable.id),
  actorId: text("actor_id").notNull().references(() => actorsTable.id),
  role: text("role"),
}, (t) => [primaryKey({ columns: [t.movieId, t.actorId] })]);

// ─── SERIES ──────────────────────────────────────────────────────────────────
export const seriesTable = pgTable("series", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  originalTitle: text("original_title"),
  description: text("description"),
  releaseYear: integer("release_year"),
  ageRating: text("age_rating"),
  posterUrl: text("poster_url"),
  backgroundUrl: text("background_url"),
  trailerUrl: text("trailer_url"),
  seasonsCount: integer("seasons_count").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  viewsCount: bigint("views_count", { mode: "number" }).notNull().default(0),
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const seriesGenresTable = pgTable("series_genres", {
  seriesId: text("series_id").notNull().references(() => seriesTable.id),
  genreId: integer("genre_id").notNull().references(() => genresTable.id),
}, (t) => [primaryKey({ columns: [t.seriesId, t.genreId] })]);

// ─── SEASONS ──────────────────────────────────────────────────────────────────
export const seasonsTable = pgTable("seasons", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  seriesId: text("series_id").notNull().references(() => seriesTable.id),
  seasonNumber: integer("season_number").notNull(),
  title: text("title"),
  episodesCount: integer("episodes_count").notNull().default(0),
  posterUrl: text("poster_url"),
  releaseDate: timestamp("release_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ─── EPISODES ────────────────────────────────────────────────────────────────
export const episodesTable = pgTable("episodes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  seasonId: text("season_id").notNull().references(() => seasonsTable.id),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  duration: integer("duration"),
  telegramFileId: text("telegram_file_id"),
  storageKey: text("storage_key"),
  sourceType: text("source_type").notNull().default("telegram"),
  thumbnailUrl: text("thumbnail_url"),
  isPublished: boolean("is_published").notNull().default(false),
  viewsCount: bigint("views_count", { mode: "number" }).notNull().default(0),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ─── VIDEO CODES ─────────────────────────────────────────────────────────────
export const videoCodesTable = pgTable("video_codes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  telegramFileId: text("telegram_file_id"),
  channelId: text("channel_id"),
  messageId: bigint("message_id", { mode: "number" }),
  fileSize: bigint("file_size", { mode: "number" }),
  duration: integer("duration"),
  status: text("status").notNull().default("pending"),
  viewsCount: bigint("views_count", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── INSERT SCHEMAS ──────────────────────────────────────────────────────────
export const insertGenreSchema = createInsertSchema(genresTable);
export const insertActorSchema = createInsertSchema(actorsTable).omit({ deletedAt: true });
export const insertMovieSchema = createInsertSchema(moviesTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertSeriesSchema = createInsertSchema(seriesTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertSeasonSchema = createInsertSchema(seasonsTable).omit({ id: true, createdAt: true, deletedAt: true });
export const insertEpisodeSchema = createInsertSchema(episodesTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });

export type Genre = typeof genresTable.$inferSelect;
export type Actor = typeof actorsTable.$inferSelect;
export type Movie = typeof moviesTable.$inferSelect;
export type Series = typeof seriesTable.$inferSelect;
export type Season = typeof seasonsTable.$inferSelect;
export type Episode = typeof episodesTable.$inferSelect;
