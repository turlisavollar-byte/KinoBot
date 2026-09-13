import { and, desc, eq, lt } from "drizzle-orm";
import {
  db,
  ratingsTable,
  watchProgressTable,
  watchSessionsTable,
} from "@workspace/db";
import type {
  UpsertProgressDTO,
  SubmitRatingDTO,
  WatchProgress,
} from "@/modules/viewing/viewing.types";

const toWatchProgress = (
  row: typeof watchProgressTable.$inferSelect,
): WatchProgress => ({
  userId: row.userId,
  contentType: row.contentType as WatchProgress["contentType"],
  contentId: row.contentId,
  positionSeconds: row.progressSeconds,
  completedAt: row.completedPercent >= 100 ? row.updatedAt : undefined,
  updatedAt: row.updatedAt,
});

export class ViewingService {
  async getWatchHistory(userId: string): Promise<WatchProgress[]> {
    const rows = await db
      .select()
      .from(watchProgressTable)
      .where(eq(watchProgressTable.userId, userId))
      .orderBy(desc(watchProgressTable.updatedAt));

    return rows.map(toWatchProgress);
  }

  async upsertProgress(userId: string, dto: UpsertProgressDTO): Promise<void> {
    const completedPercent = dto.totalSeconds
      ? Math.min(
          100,
          Math.round((dto.positionSeconds / dto.totalSeconds) * 100),
        )
      : 0;

    await db
      .insert(watchProgressTable)
      .values({
        userId,
        contentId: dto.contentId,
        contentType: dto.contentType,
        progressSeconds: dto.positionSeconds,
        completedPercent,
      })
      .onConflictDoUpdate({
        target: [
          watchProgressTable.userId,
          watchProgressTable.contentId,
          watchProgressTable.contentType,
        ],
        set: {
          progressSeconds: dto.positionSeconds,
          completedPercent,
          updatedAt: new Date(),
        },
      });

    await db.insert(watchSessionsTable).values({
      userId,
      contentId: dto.contentId,
      contentType: dto.contentType,
      durationWatched: dto.positionSeconds,
      completedAt: completedPercent >= 100 ? new Date() : null,
    });
  }

  async submitRating(userId: string, dto: SubmitRatingDTO): Promise<void> {
    await db
      .insert(ratingsTable)
      .values({
        userId,
        contentId: dto.contentId,
        contentType: dto.contentType,
        score: dto.rating,
      })
      .onConflictDoUpdate({
        target: [
          ratingsTable.userId,
          ratingsTable.contentId,
          ratingsTable.contentType,
        ],
        set: { score: dto.rating },
      });
  }

  async getContinueWatching(userId: string): Promise<WatchProgress[]> {
    const rows = await db
      .select()
      .from(watchProgressTable)
      .where(
        and(
          eq(watchProgressTable.userId, userId),
          lt(watchProgressTable.completedPercent, 100),
        ),
      )
      .orderBy(desc(watchProgressTable.updatedAt));

    return rows.map(toWatchProgress);
  }
}

export const viewingService = new ViewingService();
