import { and, desc, eq } from "drizzle-orm";
import { db, videoCodesTable } from "@workspace/db";
import type {
  IVideoCodeRepository,
  VideoCodeFilter,
} from "../../domain/repositories/video-code.repository.interface";
import { VideoCodeEntity } from "../../domain/entities/video-code.entity";
import { VideoCode } from "../../domain/value-objects/video-code.vo";
import { VideoStatusValue } from "../../domain/value-objects/video-status.vo";

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
        status: video.status.toString(),
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
    const where = filter?.status
      ? eq(videoCodesTable.status, filter.status)
      : undefined;
    const records = await db
      .select()
      .from(videoCodesTable)
      .where(where)
      .orderBy(desc(videoCodesTable.createdAt));
    return records.map((record) => this.toDomain(record));
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
      telegramFileId: video.telegramFileId,
      channelId: video.channelId,
      messageId: video.messageId,
      fileSize: video.fileSize,
      duration: video.duration,
      status: video.status.toString(),
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
      telegramFileId: record.telegramFileId,
      channelId: record.channelId,
      messageId: record.messageId,
      fileSize: record.fileSize,
      duration: record.duration,
      status: VideoStatusValue.create(record.status),
      viewsCount: record.viewsCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
