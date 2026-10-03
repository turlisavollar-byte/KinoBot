import { and, desc, eq, sql } from "drizzle-orm";
import { db, moviesTable, videoCodesTable } from "@workspace/db";
import type {
  IVideoCodeRepository,
  VideoCodeFilter,
} from "../../domain/repositories/video-code.repository.interface";
import { VideoCodeEntity } from "../../domain/entities/video-code.entity";
import { VideoCode } from "../../domain/value-objects/video-code.vo";
import { VideoStatusValue } from "../../domain/value-objects/video-status.vo";

function normalizeAccessPolicy(
  value: string | null | undefined,
): "free" | "subscription" | "channels" {
  if (value === "subscription" || value === "channels") return value;
  return "free";
}

export class DrizzleVideoCodeRepository implements IVideoCodeRepository {
  async create(video: VideoCodeEntity): Promise<VideoCodeEntity> {
    const [saved] = await db
      .insert(videoCodesTable)
      .values(this.toPersistence(video))
      .returning();
    return this.toDomain(saved);
  }

  async update(video: VideoCodeEntity): Promise<VideoCodeEntity | null> {
    const [updated] = await db
      .update(videoCodesTable)
      .set({
        title: video.title,
        description: video.description,
        movieId: video.movieId,
        status: video.status.toString(),
        accessPolicy: video.accessPolicy,
        requiredChannelIds: video.requiredChannelIds,
        updatedAt: video.updatedAt,
      })
      .where(eq(videoCodesTable.id, video.id))
      .returning();
    return updated ? this.toDomain(updated) : null;
  }

  async findById(id: string): Promise<VideoCodeEntity | null> {
    const [record] = await db
      .select()
      .from(videoCodesTable)
      .where(eq(videoCodesTable.id, id))
      .limit(1);
    return record ? this.toDomain(record) : null;
  }

  async findByCode(code: VideoCode): Promise<VideoCodeEntity | null> {
    const [record] = await db
      .select()
      .from(videoCodesTable)
      .where(eq(videoCodesTable.code, code.toString()))
      .limit(1);
    return record ? this.toDomain(record) : null;
  }

  async findAll(filter?: VideoCodeFilter): Promise<VideoCodeEntity[]> {
    const conditions = [];
    if (filter?.status) conditions.push(eq(videoCodesTable.status, filter.status));
    if (filter?.movieId) conditions.push(eq(videoCodesTable.movieId, filter.movieId));
    const records = await db
      .select()
      .from(videoCodesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(videoCodesTable.createdAt));
    return records.map((record) => this.toDomain(record));
  }

  async findByMovieId(movieId: string): Promise<VideoCodeEntity[]> {
    return this.findAll({ movieId });
  }

  async movieExists(movieId: string): Promise<boolean> {
    const [movie] = await db
      .select({ id: moviesTable.id })
      .from(moviesTable)
      .where(
        and(
          eq(moviesTable.id, movieId),
          sql`${moviesTable.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    return movie !== undefined;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db
      .delete(videoCodesTable)
      .where(eq(videoCodesTable.id, id))
      .returning({ id: videoCodesTable.id });
    return deleted.length > 0;
  }

  async exists(code: VideoCode): Promise<boolean> {
    const [record] = await db
      .select({ id: videoCodesTable.id })
      .from(videoCodesTable)
      .where(eq(videoCodesTable.code, code.toString()))
      .limit(1);
    return Boolean(record);
  }

  private toPersistence(video: VideoCodeEntity) {
    return {
      id: video.id,
      code: video.code.toString(),
      title: video.title,
      description: video.description,
      movieId: video.movieId,
      telegramFileId: video.telegramFileId,
      channelId: video.channelId,
      messageId: video.messageId,
      fileSize: video.fileSize,
      duration: video.duration,
      status: video.status.toString(),
      accessPolicy: video.accessPolicy,
      requiredChannelIds: video.requiredChannelIds,
      viewsCount: video.viewsCount,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    };
  }

  private toDomain(
    record: typeof videoCodesTable.$inferSelect,
  ): VideoCodeEntity {
    return VideoCodeEntity.reconstitute({
      id: record.id,
      code: VideoCode.create(record.code),
      title: record.title,
      description: record.description,
      movieId: record.movieId,
      telegramFileId: record.telegramFileId,
      channelId: record.channelId,
      messageId: record.messageId,
      fileSize: record.fileSize,
      duration: record.duration,
      status: VideoStatusValue.create(record.status),
      accessPolicy: normalizeAccessPolicy(record.accessPolicy),
      requiredChannelIds: record.requiredChannelIds ?? null,
      viewsCount: record.viewsCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
