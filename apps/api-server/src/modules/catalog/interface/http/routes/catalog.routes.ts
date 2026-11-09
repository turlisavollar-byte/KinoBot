import { Router } from "express";
import { createReadStream } from "node:fs";
import { open, unlink } from "node:fs/promises";
import { getAnalyticsCacheService } from "@/modules/analytics";
import {
  and,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import {
  db,
  moviesTable,
  telegramMediaTable,
  episodesTable,
  actorsTable,
  genresTable,
  seasonsTable,
  seriesGenresTable,
  seriesTable,
} from "@workspace/db";
import { storage } from "@/infrastructure/storage/minio";
import { Logger } from "@/shared/utils/logger";
import {
  createMovieStorageKey,
  hasMp4Signature,
  MAX_MOVIE_UPLOAD_BYTES,
  movieMediaUploadMiddleware,
} from "../movie-media-upload";
import {
  createMoviePosterStorageKey,
  hasMoviePosterSignature,
  MAX_MOVIE_POSTER_UPLOAD_BYTES,
  moviePosterUploadMiddleware,
} from "../movie-poster-upload";
import {
  CreateEpisodeBody,
  CreateEpisodeParams,
  CreateSeasonBody,
  CreateSeasonParams,
  CreateSeriesBody,
  DeleteEpisodeParams,
  DeleteSeriesParams,
  GetSeriesParams,
  ListEpisodesParams,
  ListSeasonsParams,
  ListSeriesQueryParams,
  PublishEpisodeBody,
  PublishEpisodeParams,
  PublishSeriesBody,
  PublishSeriesParams,
  UpdateEpisodeBody,
  UpdateEpisodeParams,
  UpdateSeriesBody,
  UpdateSeriesParams,
  ListActorsQueryParams,
  CreateActorBody,
  GetActorParams,
  AttachActorToMovieParams,
  AttachActorToMovieBody,
  UpdateActorMovieRoleParams,
  UpdateActorMovieRoleBody,
  DetachActorFromMovieParams,
  GetMovieVideoCodesParams,
  DeleteActorParams,
  UpdateActorParams,
  UpdateActorBody,
  CreateGenreBody,
  UpdateGenreParams,
  UpdateGenreBody,
  DeleteGenreParams,
} from "@workspace/api-zod";
import { CatalogController } from "../controllers/catalog.controller";
import { requireAuth, requirePermission } from "@/shared/middleware";
import { Permission } from "@/shared/constants/permissions";
import { DrizzleCatalogRepository } from "../../../application/repositories/drizzle-catalog.repository";
import { ListMoviesUseCase } from "../../../domain/use-cases/list-movies.use-case";
import { GetMovieUseCase } from "../../../domain/use-cases/get-movie.use-case";
import { CreateMovieUseCase } from "../../../domain/use-cases/create-movie.use-case";
import { UpdateMovieUseCase } from "../../../domain/use-cases/update-movie.use-case";
import { DeleteMovieUseCase } from "../../../domain/use-cases/delete-movie.use-case";
import { ListSeriesUseCase } from "../../../domain/use-cases/list-series.use-case";
import { ListGenresUseCase } from "../../../domain/use-cases/list-genres.use-case";
import { ListActorsUseCase } from "../../../domain/use-cases/list-actors.use-case";
import { toActorInsert, toActorResponse, toActorUpdate } from "../actor.mapper";
import { GetActorDetailUseCase } from "../../../domain/use-cases/get-actor-detail.use-case";
import { AttachActorToMovieUseCase } from "../../../domain/use-cases/attach-actor-to-movie.use-case";
import { DetachActorFromMovieUseCase } from "../../../domain/use-cases/detach-actor-from-movie.use-case";
import { UpdateActorMovieRoleUseCase } from "../../../domain/use-cases/update-actor-movie-role.use-case";
import { ActorMovieRelationError } from "../../../domain/use-cases/actor-movie.errors";
import { DrizzleVideoCodeRepository } from "@/modules/video-content/infrastructure/repositories/drizzle-video-code.repository";
import { ListMovieVideoCodesUseCase } from "@/modules/video-content/domain/use-cases/list-movie-video-codes.use-case";

const router = Router();
const logger = Logger.getInstance("CatalogMovieUpload");
const actorRepository = new DrizzleCatalogRepository();
const getActorDetail = new GetActorDetailUseCase(actorRepository);
const attachActorToMovie = new AttachActorToMovieUseCase(actorRepository);
const detachActorFromMovie = new DetachActorFromMovieUseCase(actorRepository);
const updateActorMovieRole = new UpdateActorMovieRoleUseCase(actorRepository);
const listMovieVideoCodes = new ListMovieVideoCodesUseCase(
  new DrizzleVideoCodeRepository(),
);

function handleActorMovieError(
  error: unknown,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  if (error instanceof ActorMovieRelationError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  next(error);
}

// All routes require authentication
router.use(requireAuth);

// Lazy controller resolution
function getController() {
  const repository = new DrizzleCatalogRepository();
  return new CatalogController(
    new ListMoviesUseCase(repository),
    new GetMovieUseCase(repository),
    new CreateMovieUseCase(repository),
    new UpdateMovieUseCase(repository),
    new DeleteMovieUseCase(repository),
    new ListSeriesUseCase(repository),
    new ListGenresUseCase(repository),
    new ListActorsUseCase(repository),
  );
}

// ─── MOVIES ──────────────────────────────────────────────────────────────────
router.get(
  "/catalog/movies",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listMovies(req, res, next),
);
router.post(
  "/catalog/movies",
  requirePermission(Permission.CREATE_CONTENT),
  (req, res, next) => getController().createMovie(req, res, next),
);
router.get(
  "/catalog/movies/:id",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().getMovie(req, res, next),
);
router.get(
  "/catalog/movies/:id/media",
  requirePermission(Permission.READ_CONTENT),
  async (req, res, next): Promise<void> => {
    try {
      const movieId = String(req.params.id);
      const [movie] = await db
        .select({
          id: moviesTable.id,
          storageKey: moviesTable.storageKey,
          sourceType: moviesTable.sourceType,
        })
        .from(moviesTable)
        .where(and(eq(moviesTable.id, movieId), isNull(moviesTable.deletedAt)))
        .limit(1);
      if (!movie) {
        res.status(404).json({
          error: { code: "MOVIE_NOT_FOUND", message: "Movie not found" },
        });
        return;
      }

      const media = await db
        .select({
          id: telegramMediaTable.id,
          fileName: telegramMediaTable.fileName,
          fileSize: telegramMediaTable.fileSize,
          duration: telegramMediaTable.duration,
          uploadedAt: telegramMediaTable.uploadedAt,
        })
        .from(telegramMediaTable)
        .where(
          and(
            eq(telegramMediaTable.status, "uploaded"),
            eq(telegramMediaTable.mimeType, "video/mp4"),
            gt(telegramMediaTable.fileSize, 0),
            lte(telegramMediaTable.fileSize, MAX_MOVIE_UPLOAD_BYTES),
            isNotNull(telegramMediaTable.storageBucket),
            isNotNull(telegramMediaTable.storageKey),
          ),
        )
        .orderBy(
          desc(telegramMediaTable.uploadedAt),
          desc(telegramMediaTable.createdAt),
        )
        .limit(100);

      const mediaAvailable =
        Boolean(movie.storageKey) &&
        ["s3", "minio"].includes(movie.sourceType.toLowerCase());
      const previewUrl = mediaAvailable
        ? await storage.getPresignedUrl(
            process.env.VIDEO_BUCKET || "videos",
            movie.storageKey!.replace(/^\/+/, ""),
            300,
          )
        : null;
      res.json({
        media,
        movieMediaStatus: mediaAvailable ? "uploaded" : "missing",
        previewUrl,
      });
    } catch (error) {
      next(error);
    }
  },
);
router.get(
  "/catalog/telegram-media",
  requirePermission(Permission.READ_CONTENT),
  async (_req, res, next): Promise<void> => {
    try {
      const media = await db
        .select({
          id: telegramMediaTable.id,
          fileName: telegramMediaTable.fileName,
          fileSize: telegramMediaTable.fileSize,
          duration: telegramMediaTable.duration,
          uploadedAt: telegramMediaTable.uploadedAt,
        })
        .from(telegramMediaTable)
        .where(
          and(
            eq(telegramMediaTable.status, "uploaded"),
            eq(telegramMediaTable.mimeType, "video/mp4"),
            gt(telegramMediaTable.fileSize, 0),
            lte(telegramMediaTable.fileSize, MAX_MOVIE_UPLOAD_BYTES),
            isNotNull(telegramMediaTable.storageBucket),
            isNotNull(telegramMediaTable.storageKey),
          ),
        )
        .orderBy(
          desc(telegramMediaTable.uploadedAt),
          desc(telegramMediaTable.createdAt),
        )
        .limit(100);
      res.json({ media });
    } catch (error) {
      next(error);
    }
  },
);
router.post(
  "/catalog/movies/:id/upload",
  requirePermission(Permission.UPDATE_CONTENT),
  movieMediaUploadMiddleware,
  async (req, res, next): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        error: {
          code: "MOVIE_FILE_REQUIRED",
          message: "Select an MP4 video file",
        },
      });
      return;
    }

    let uploadedKey: string | null = null;
    let uploadedBucket: string | null = null;
    let metadataUpdated = false;
    try {
      const movieId = String(req.params.id);
      const [movie] = await db
        .select({
          id: moviesTable.id,
          storageKey: moviesTable.storageKey,
          sourceType: moviesTable.sourceType,
        })
        .from(moviesTable)
        .where(and(eq(moviesTable.id, movieId), isNull(moviesTable.deletedAt)))
        .limit(1);
      if (!movie) {
        res.status(404).json({
          error: { code: "MOVIE_NOT_FOUND", message: "Movie not found" },
        });
        return;
      }

      const fileHandle = await open(file.path, "r");
      const header = Buffer.alloc(12);
      let bytesRead: number;
      try {
        ({ bytesRead } = await fileHandle.read(header, 0, header.length, 0));
      } finally {
        await fileHandle.close();
      }
      if (bytesRead < header.length || !hasMp4Signature(header)) {
        res.status(415).json({
          error: {
            code: "INVALID_MP4_FILE",
            message: "The uploaded file is not a valid MP4 video",
          },
        });
        return;
      }

      const bucket = process.env.VIDEO_BUCKET || "videos";
      const storageKey = createMovieStorageKey(movie.id);
      await storage.uploadStream(
        bucket,
        storageKey,
        createReadStream(file.path),
        "video/mp4",
        file.size,
        30 * 60 * 1000,
      );
      uploadedKey = storageKey;
      uploadedBucket = bucket;

      const [updated] = await db
        .update(moviesTable)
        .set({ storageKey, sourceType: "s3", updatedAt: new Date() })
        .where(
          and(
            eq(moviesTable.id, movie.id),
            isNull(moviesTable.deletedAt),
            movie.storageKey
              ? eq(moviesTable.storageKey, movie.storageKey)
              : isNull(moviesTable.storageKey),
          ),
        )
        .returning({ id: moviesTable.id });
      if (!updated) {
        await storage.delete(bucket, storageKey);
        uploadedKey = null;
        uploadedBucket = null;
        res.status(409).json({
          error: {
            code: "MOVIE_MEDIA_CHANGED",
            message: "Movie media changed during upload; retry the upload",
          },
        });
        return;
      }
      metadataUpdated = true;

      if (
        movie.storageKey &&
        ["s3", "minio"].includes(movie.sourceType.toLowerCase()) &&
        movie.storageKey !== storageKey
      ) {
        try {
          await storage.delete(bucket, movie.storageKey);
        } catch (cleanupError) {
          logger.error(
            "Replaced movie object could not be removed",
            undefined,
            cleanupError,
          );
        }
      }

      res.json({ id: movie.id, sourceType: "s3", storageKey });
    } catch (error) {
      if (uploadedKey && uploadedBucket && !metadataUpdated) {
        try {
          await storage.delete(uploadedBucket, uploadedKey);
        } catch (cleanupError) {
          logger.error(
            "Failed to clean up an unlinked movie upload",
            undefined,
            cleanupError,
          );
        }
      }
      next(error);
    } finally {
      try {
        await unlink(file.path);
      } catch (cleanupError) {
        if ((cleanupError as NodeJS.ErrnoException).code !== "ENOENT") {
          logger.error(
            "Failed to remove temporary movie upload",
            undefined,
            cleanupError,
          );
        }
      }
    }
  },
);

router.post(
  "/catalog/movies/:id/poster",
  requirePermission(Permission.UPDATE_CONTENT),
  moviePosterUploadMiddleware,
  async (req, res, next): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        error: {
          code: "POSTER_FILE_REQUIRED",
          message: "Select a JPEG, PNG, or WebP poster",
        },
      });
      return;
    }

    let uploadedKey: string | null = null;
    let metadataUpdated = false;
    const posterBucket = process.env.VIDEO_BUCKET || "videos";
    try {
      const movieId = String(req.params.id);
      const [movie] = await db
        .select({ id: moviesTable.id, posterUrl: moviesTable.posterUrl })
        .from(moviesTable)
        .where(and(eq(moviesTable.id, movieId), isNull(moviesTable.deletedAt)))
        .limit(1);
      if (!movie) {
        res.status(404).json({
          error: { code: "MOVIE_NOT_FOUND", message: "Movie not found" },
        });
        return;
      }

      const fileHandle = await open(file.path, "r");
      const header = Buffer.alloc(12);
      let bytesRead: number;
      try {
        ({ bytesRead } = await fileHandle.read(header, 0, header.length, 0));
      } finally {
        await fileHandle.close();
      }
      if (
        bytesRead < 12 ||
        !hasMoviePosterSignature(header.subarray(0, bytesRead), file.mimetype)
      ) {
        res.status(415).json({
          error: {
            code: "INVALID_POSTER_FILE",
            message: "Poster file signature does not match its image type",
          },
        });
        return;
      }

      const key = createMoviePosterStorageKey(movie.id, file.originalname);
      await storage.uploadStream(
        posterBucket,
        key,
        createReadStream(file.path),
        file.mimetype,
        file.size,
        120_000,
      );
      uploadedKey = key;
      const posterUrl = await storage.getUrl(posterBucket, key);
      const [updated] = await db
        .update(moviesTable)
        .set({ posterUrl, updatedAt: new Date() })
        .where(
          and(
            eq(moviesTable.id, movie.id),
            isNull(moviesTable.deletedAt),
            movie.posterUrl
              ? eq(moviesTable.posterUrl, movie.posterUrl)
              : isNull(moviesTable.posterUrl),
          ),
        )
        .returning({ id: moviesTable.id });
      if (!updated) {
        await storage.delete(posterBucket, key);
        uploadedKey = null;
        res.status(409).json({
          error: {
            code: "MOVIE_POSTER_CHANGED",
            message: "Movie poster changed during upload; refresh and retry",
          },
        });
        return;
      }
      metadataUpdated = true;
      res.json({ id: movie.id, posterUrl });
    } catch (error) {
      if (uploadedKey && !metadataUpdated) {
        try {
          await storage.delete(posterBucket, uploadedKey);
        } catch (cleanupError) {
          logger.error(
            "Failed to clean up an unlinked movie poster",
            undefined,
            cleanupError,
          );
        }
      }
      next(error);
    } finally {
      try {
        await unlink(file.path);
      } catch (cleanupError) {
        if ((cleanupError as NodeJS.ErrnoException).code !== "ENOENT") {
          logger.error(
            "Failed to remove temporary movie poster",
            undefined,
            cleanupError,
          );
        }
      }
    }
  },
);
router.post(
  ["/catalog/movies/:id/link-telegram-media", "/catalog/movies/:id/link-media"],
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res, next): Promise<void> => {
    const movieId = String(req.params.id);
    const mediaId =
      typeof req.body?.mediaId === "string" ? req.body.mediaId.trim() : "";
    if (!mediaId || mediaId.length > 128) {
      res.status(400).json({
        error: {
          code: "INVALID_TELEGRAM_MEDIA_ID",
          message: "Select an uploaded Telegram video",
        },
      });
      return;
    }

    let uploadedKey: string | null = null;
    let metadataUpdated = false;
    const bucket = process.env.VIDEO_BUCKET || "videos";
    const transferTimeoutMs = 30 * 60 * 1000;
    try {
      const [movie] = await db
        .select({
          id: moviesTable.id,
          storageKey: moviesTable.storageKey,
          sourceType: moviesTable.sourceType,
        })
        .from(moviesTable)
        .where(and(eq(moviesTable.id, movieId), isNull(moviesTable.deletedAt)))
        .limit(1);
      if (!movie) {
        res.status(404).json({
          error: { code: "MOVIE_NOT_FOUND", message: "Movie not found" },
        });
        return;
      }

      const [media] = await db
        .select({
          id: telegramMediaTable.id,
          fileUniqueId: telegramMediaTable.fileUniqueId,
          mimeType: telegramMediaTable.mimeType,
          fileSize: telegramMediaTable.fileSize,
          storageBucket: telegramMediaTable.storageBucket,
          storageKey: telegramMediaTable.storageKey,
        })
        .from(telegramMediaTable)
        .where(
          and(
            eq(telegramMediaTable.id, mediaId),
            eq(telegramMediaTable.status, "uploaded"),
            eq(telegramMediaTable.mimeType, "video/mp4"),
            gt(telegramMediaTable.fileSize, 0),
            lte(telegramMediaTable.fileSize, MAX_MOVIE_UPLOAD_BYTES),
            isNotNull(telegramMediaTable.storageBucket),
            isNotNull(telegramMediaTable.storageKey),
          ),
        )
        .limit(1);
      if (!media?.storageBucket || !media.storageKey) {
        res.status(404).json({
          error: {
            code: "TELEGRAM_MEDIA_NOT_AVAILABLE",
            message: "Uploaded MP4 video not found",
          },
        });
        return;
      }

      const storageKey = createMovieStorageKey(movie.id);
      const sourceStream = await storage.getObjectStream(
        media.storageBucket,
        media.storageKey,
        transferTimeoutMs,
      );
      try {
        await storage.uploadStream(
          bucket,
          storageKey,
          sourceStream,
          "video/mp4",
          media.fileSize,
          transferTimeoutMs,
        );
      } finally {
        sourceStream.destroy();
      }
      uploadedKey = storageKey;

      const [updated] = await db
        .update(moviesTable)
        .set({
          storageKey,
          sourceType: "s3",
          telegramFileId: media.fileUniqueId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(moviesTable.id, movie.id),
            isNull(moviesTable.deletedAt),
            movie.storageKey
              ? eq(moviesTable.storageKey, movie.storageKey)
              : isNull(moviesTable.storageKey),
          ),
        )
        .returning({ id: moviesTable.id });
      if (!updated) {
        await storage.delete(bucket, storageKey);
        uploadedKey = null;
        res.status(409).json({
          error: {
            code: "MOVIE_MEDIA_CHANGED",
            message: "Movie media changed during linking; refresh and retry",
          },
        });
        return;
      }
      metadataUpdated = true;

      if (
        movie.storageKey &&
        ["s3", "minio"].includes(movie.sourceType.toLowerCase()) &&
        movie.storageKey !== storageKey
      ) {
        try {
          await storage.delete(bucket, movie.storageKey);
        } catch (cleanupError) {
          logger.error(
            "Replaced movie object could not be removed",
            undefined,
            cleanupError,
          );
        }
      }

      res.json({
        id: movie.id,
        sourceType: "s3",
        storageKey,
        telegramFileId: media.fileUniqueId,
      });
    } catch (error) {
      if (uploadedKey && !metadataUpdated) {
        try {
          await storage.delete(bucket, uploadedKey);
        } catch (cleanupError) {
          logger.error(
            "Failed to clean up an unlinked Telegram movie copy",
            undefined,
            cleanupError,
          );
        }
      }
      next(error);
    }
  },
);
router.patch(
  "/catalog/movies/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  (req, res, next) => getController().updateMovie(req, res, next),
);
router.delete(
  "/catalog/movies/:id",
  requirePermission(Permission.DELETE_CONTENT),
  (req, res, next) => getController().deleteMovie(req, res, next),
);
router.post(
  "/catalog/movies/:id/publish",
  requirePermission(Permission.UPDATE_CONTENT),
  (req, res, next) => getController().publishMovie(req, res, next),
);

// ─── SERIES ──────────────────────────────────────────────────────────────────
router.get(
  "/catalog/series",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listSeries(req, res, next),
);

async function getSeriesWithGenres(id: string) {
  const [series] = await db
    .select()
    .from(seriesTable)
    .where(and(eq(seriesTable.id, id), sql`${seriesTable.deletedAt} IS NULL`))
    .limit(1);
  if (!series) return null;

  const genreRows = await db
    .select({ genre: genresTable })
    .from(seriesGenresTable)
    .innerJoin(genresTable, eq(seriesGenresTable.genreId, genresTable.id))
    .where(eq(seriesGenresTable.seriesId, id));

  return {
    ...series,
    viewsCount: Number(series.viewsCount),
    ratingAvg: parseFloat(series.ratingAvg ?? "0"),
    genres: genreRows.map((row) => row.genre),
  };
}

router.post(
  "/catalog/series",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = CreateSeriesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [series] = await db
      .insert(seriesTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(await getSeriesWithGenres(series.id));
  },
);

router.get(
  "/catalog/series/:id",
  requirePermission(Permission.READ_CONTENT),
  async (req, res): Promise<void> => {
    const params = GetSeriesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const series = await getSeriesWithGenres(params.data.id);
    if (!series) {
      res.status(404).json({ error: "Series not found" });
      return;
    }
    res.json(series);
  },
);

router.patch(
  "/catalog/series/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateSeriesParams.safeParse(req.params);
    const body = UpdateSeriesBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    await db
      .update(seriesTable)
      .set(body.data)
      .where(
        and(
          eq(seriesTable.id, params.data.id),
          sql`${seriesTable.deletedAt} IS NULL`,
        ),
      );
    const series = await getSeriesWithGenres(params.data.id);
    if (!series) {
      res.status(404).json({ error: "Series not found" });
      return;
    }
    res.json(series);
  },
);

router.delete(
  "/catalog/series/:id",
  requirePermission(Permission.DELETE_CONTENT),
  async (req, res): Promise<void> => {
    const params = DeleteSeriesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .update(seriesTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(seriesTable.id, params.data.id),
          sql`${seriesTable.deletedAt} IS NULL`,
        ),
      );
    await getAnalyticsCacheService().invalidate("analytics:v2:overview");
    res.sendStatus(204);
  },
);

router.post(
  "/catalog/series/:id/publish",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = PublishSeriesParams.safeParse(req.params);
    const body = PublishSeriesBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    await db
      .update(seriesTable)
      .set({ isPublished: body.data.published })
      .where(
        and(
          eq(seriesTable.id, params.data.id),
          sql`${seriesTable.deletedAt} IS NULL`,
        ),
      );
    const series = await getSeriesWithGenres(params.data.id);
    if (!series) {
      res.status(404).json({ error: "Series not found" });
      return;
    }
    res.json(series);
  },
);

router.get(
  "/catalog/series/:id/seasons",
  requirePermission(Permission.READ_CONTENT),
  async (req, res): Promise<void> => {
    const params = ListSeasonsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const seasons = await db
      .select()
      .from(seasonsTable)
      .where(
        and(
          eq(seasonsTable.seriesId, params.data.id),
          sql`${seasonsTable.deletedAt} IS NULL`,
        ),
      )
      .orderBy(seasonsTable.seasonNumber);
    res.json(seasons);
  },
);

router.post(
  "/catalog/series/:id/seasons",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = CreateSeasonParams.safeParse(req.params);
    const body = CreateSeasonBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [series] = await db
      .select({ id: seriesTable.id })
      .from(seriesTable)
      .where(
        and(
          eq(seriesTable.id, params.data.id),
          sql`${seriesTable.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!series) {
      res.status(404).json({ error: "Series not found" });
      return;
    }

    const [season] = await db.transaction(async (tx) => {
      const [createdSeason] = await tx
        .insert(seasonsTable)
        .values({ ...body.data, seriesId: params.data.id })
        .returning();
      await tx
        .update(seriesTable)
        .set({ seasonsCount: sql`${seriesTable.seasonsCount} + 1` })
        .where(eq(seriesTable.id, params.data.id));
      return [createdSeason];
    });
    res.status(201).json(season);
  },
);

router.get(
  "/catalog/series/:seriesId/seasons/:seasonId/episodes",
  requirePermission(Permission.READ_CONTENT),
  async (req, res): Promise<void> => {
    const params = ListEpisodesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const episodes = await db
      .select()
      .from(episodesTable)
      .where(
        and(
          eq(episodesTable.seasonId, params.data.seasonId),
          sql`${episodesTable.deletedAt} IS NULL`,
        ),
      )
      .orderBy(episodesTable.episodeNumber);
    res.json(
      episodes.map((episode) => ({
        ...episode,
        viewsCount: Number(episode.viewsCount),
      })),
    );
  },
);

router.post(
  "/catalog/series/:seriesId/seasons/:seasonId/episodes",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = CreateEpisodeParams.safeParse(req.params);
    const body = CreateEpisodeBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [season] = await db
      .select({ id: seasonsTable.id })
      .from(seasonsTable)
      .where(
        and(
          eq(seasonsTable.id, params.data.seasonId),
          eq(seasonsTable.seriesId, params.data.seriesId),
          sql`${seasonsTable.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!season) {
      res.status(404).json({ error: "Season not found for this series" });
      return;
    }

    const [existingEpisode] = await db
      .select({ id: episodesTable.id })
      .from(episodesTable)
      .where(
        and(
          eq(episodesTable.seasonId, params.data.seasonId),
          eq(episodesTable.episodeNumber, body.data.episodeNumber),
          sql`${episodesTable.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (existingEpisode) {
      res.status(409).json({ error: "Episode number already exists" });
      return;
    }

    const [episode] = await db.transaction(async (tx) => {
      const [createdEpisode] = await tx
        .insert(episodesTable)
        .values({ ...body.data, seasonId: params.data.seasonId })
        .returning();
      await tx
        .update(seasonsTable)
        .set({ episodesCount: sql`${seasonsTable.episodesCount} + 1` })
        .where(eq(seasonsTable.id, params.data.seasonId));
      return [createdEpisode];
    });
    res
      .status(201)
      .json({ ...episode, viewsCount: Number(episode.viewsCount) });
  },
);

router.patch(
  "/catalog/episodes/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateEpisodeParams.safeParse(req.params);
    const body = UpdateEpisodeBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [episode] = await db
      .update(episodesTable)
      .set(body.data)
      .where(
        and(
          eq(episodesTable.id, params.data.id),
          sql`${episodesTable.deletedAt} IS NULL`,
        ),
      )
      .returning();
    if (!episode) {
      res.status(404).json({ error: "Episode not found" });
      return;
    }
    res.json({ ...episode, viewsCount: Number(episode.viewsCount) });
  },
);

router.delete(
  "/catalog/episodes/:id",
  requirePermission(Permission.DELETE_CONTENT),
  async (req, res): Promise<void> => {
    const params = DeleteEpisodeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [episode] = await db
      .update(episodesTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(episodesTable.id, params.data.id),
          sql`${episodesTable.deletedAt} IS NULL`,
        ),
      )
      .returning({ seasonId: episodesTable.seasonId });
    if (episode) {
      await db
        .update(seasonsTable)
        .set({
          episodesCount: sql`GREATEST(${seasonsTable.episodesCount} - 1, 0)`,
        })
        .where(eq(seasonsTable.id, episode.seasonId));
    }
    res.sendStatus(204);
  },
);

router.post(
  "/catalog/episodes/:id/publish",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = PublishEpisodeParams.safeParse(req.params);
    const body = PublishEpisodeBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [episode] = await db
      .update(episodesTable)
      .set({ isPublished: body.data.published })
      .where(
        and(
          eq(episodesTable.id, params.data.id),
          sql`${episodesTable.deletedAt} IS NULL`,
        ),
      )
      .returning();
    if (!episode) {
      res.status(404).json({ error: "Episode not found" });
      return;
    }
    res.json({ ...episode, viewsCount: Number(episode.viewsCount) });
  },
);

// ─── GENRES ──────────────────────────────────────────────────────────────────
router.get(
  "/genres",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listGenres(req, res, next),
);
router.get(
  "/catalog/genres",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listGenres(req, res, next),
);
router.post(
  "/genres",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = CreateGenreBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [genre] = await db
      .insert(genresTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(genre);
  },
);
router.patch(
  "/genres/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateGenreParams.safeParse(req.params);
    const body = UpdateGenreBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [genre] = await db
      .update(genresTable)
      .set(body.data)
      .where(
        and(
          eq(genresTable.id, params.data.id),
          sql`${genresTable.deletedAt} IS NULL`,
        ),
      )
      .returning();
    if (!genre) {
      res.status(404).json({ error: "Genre not found" });
      return;
    }
    res.json(genre);
  },
);
router.delete(
  "/genres/:id",
  requirePermission(Permission.DELETE_CONTENT),
  async (req, res): Promise<void> => {
    const params = DeleteGenreParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .update(genresTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(genresTable.id, params.data.id),
          sql`${genresTable.deletedAt} IS NULL`,
        ),
      );
    res.sendStatus(204);
  },
);

// ─── ACTORS ──────────────────────────────────────────────────────────────────
router.get(
  "/actors/:id",
  requirePermission(Permission.READ_CONTENT),
  async (req, res, next): Promise<void> => {
    const params = GetActorParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    try {
      const actor = await getActorDetail.execute(params.data.id);
      if (!actor) {
        res.status(404).json({ error: "Actor not found" });
        return;
      }
      res.json(actor);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/actors/:id/movies",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res, next): Promise<void> => {
    const params = AttachActorToMovieParams.safeParse(req.params);
    const body = AttachActorToMovieBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    try {
      await attachActorToMovie.execute(
        params.data.id,
        body.data.movieId,
        body.data.role ?? null,
      );
      res.sendStatus(204);
    } catch (error) {
      handleActorMovieError(error, res, next);
    }
  },
);

router.patch(
  "/actors/:id/movies/:movieId",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res, next): Promise<void> => {
    const params = UpdateActorMovieRoleParams.safeParse(req.params);
    const body = UpdateActorMovieRoleBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    try {
      await updateActorMovieRole.execute(
        params.data.id,
        params.data.movieId,
        body.data.role ?? null,
      );
      res.sendStatus(204);
    } catch (error) {
      handleActorMovieError(error, res, next);
    }
  },
);

router.delete(
  "/actors/:id/movies/:movieId",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res, next): Promise<void> => {
    const params = DetachActorFromMovieParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    try {
      await detachActorFromMovie.execute(params.data.id, params.data.movieId);
      res.sendStatus(204);
    } catch (error) {
      handleActorMovieError(error, res, next);
    }
  },
);

router.get(
  "/movies/:id/video-codes",
  requirePermission(Permission.READ_CONTENT),
  async (req, res, next): Promise<void> => {
    const params = GetMovieVideoCodesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    try {
      const codes = await listMovieVideoCodes.execute(params.data.id);
      res.json(
        codes.map((video) => ({
          id: video.id,
          code: video.code.toString(),
          title: video.title,
          status: video.status.toString(),
          viewsCount: video.viewsCount,
          movieId: video.movieId,
        })),
      );
    } catch (error) {
      if (error instanceof Error && error.message === "Movie not found") {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  },
);

router.get(
  "/actors",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listActors(req, res, next),
);
router.get(
  "/catalog/actors",
  requirePermission(Permission.READ_CONTENT),
  (req, res, next) => getController().listActors(req, res, next),
);
router.post(
  "/actors",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = CreateActorBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [actor] = await db
      .insert(actorsTable)
      .values(toActorInsert(parsed.data))
      .returning();
    res.status(201).json(toActorResponse(actor));
  },
);
router.patch(
  "/actors/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateActorParams.safeParse(req.params);
    const body = UpdateActorBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [actor] = await db
      .update(actorsTable)
      .set(toActorUpdate(body.data))
      .where(
        and(
          eq(actorsTable.id, params.data.id),
          sql`${actorsTable.deletedAt} IS NULL`,
        ),
      )
      .returning();
    if (!actor) {
      res.status(404).json({ error: "Actor not found" });
      return;
    }
    res.json(toActorResponse(actor));
  },
);

router.post(
  "/catalog/actors",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = CreateActorBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [actor] = await db
      .insert(actorsTable)
      .values(toActorInsert(parsed.data))
      .returning();
    res.status(201).json(toActorResponse(actor));
  },
);

router.patch(
  "/catalog/actors/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateActorParams.safeParse(req.params);
    const body = UpdateActorBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [actor] = await db
      .update(actorsTable)
      .set(toActorUpdate(body.data))
      .where(
        and(
          eq(actorsTable.id, params.data.id),
          sql`${actorsTable.deletedAt} IS NULL`,
        ),
      )
      .returning();
    if (!actor) {
      res.status(404).json({ error: "Actor not found" });
      return;
    }
    res.json(toActorResponse(actor));
  },
);

const deleteActorHandler = async (
  req: import("express").Request,
  res: import("express").Response,
): Promise<void> => {
  const params = DeleteActorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [actor] = await db
    .update(actorsTable)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(actorsTable.id, params.data.id),
        sql`${actorsTable.deletedAt} IS NULL`,
      ),
    )
    .returning({ id: actorsTable.id });

  if (!actor) {
    res.status(404).json({ error: "Actor not found" });
    return;
  }

  res.sendStatus(204);
};

router.delete(
  "/actors/:id",
  requirePermission(Permission.DELETE_CONTENT),
  deleteActorHandler,
);
router.delete(
  "/catalog/actors/:id",
  requirePermission(Permission.DELETE_CONTENT),
  deleteActorHandler,
);

router.post(
  "/catalog/genres",
  requirePermission(Permission.CREATE_CONTENT),
  async (req, res): Promise<void> => {
    const parsed = CreateGenreBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [genre] = await db
      .insert(genresTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(genre);
  },
);

router.patch(
  "/catalog/genres/:id",
  requirePermission(Permission.UPDATE_CONTENT),
  async (req, res): Promise<void> => {
    const params = UpdateGenreParams.safeParse(req.params);
    const body = UpdateGenreBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: params.success ? body.error?.message : params.error.message,
      });
      return;
    }
    const [genre] = await db
      .update(genresTable)
      .set(body.data)
      .where(
        and(
          eq(genresTable.id, params.data.id),
          sql`${genresTable.deletedAt} IS NULL`,
        ),
      )
      .returning();
    if (!genre) {
      res.status(404).json({ error: "Genre not found" });
      return;
    }
    res.json(genre);
  },
);

router.delete(
  "/catalog/genres/:id",
  requirePermission(Permission.DELETE_CONTENT),
  async (req, res): Promise<void> => {
    const params = DeleteGenreParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .update(genresTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(genresTable.id, params.data.id),
          sql`${genresTable.deletedAt} IS NULL`,
        ),
      );
    res.sendStatus(204);
  },
);

export default router;
