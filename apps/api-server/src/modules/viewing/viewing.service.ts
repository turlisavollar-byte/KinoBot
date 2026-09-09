/**
 * Viewing Service — STUB
 *
 * TODO: Wire to watchSessionsTable and ratingsTable from DB schema.
 * Core features:
 *   - Continue watching (resume from last position)
 *   - Watch history
 *   - User ratings
 *   - Trending / popular content calculation
 */

import type { UpsertProgressDTO, SubmitRatingDTO, WatchProgress } from "@/modules/viewing/viewing.types";
import { logger } from "@/lib/logger";

export class ViewingService {
  async getWatchHistory(_userId: string): Promise<WatchProgress[]> {
    logger.warn("ViewingService.getWatchHistory: stub");
    return [];
  }

  async upsertProgress(_userId: string, _dto: UpsertProgressDTO): Promise<void> {
    // TODO: Upsert into watchSessionsTable
  }

  async submitRating(_userId: string, _dto: SubmitRatingDTO): Promise<void> {
    // TODO: Insert into ratingsTable, update content ratingAvg
  }

  async getContinueWatching(_userId: string): Promise<WatchProgress[]> {
    // TODO: Return in-progress content (not completed)
    return [];
  }
}

export const viewingService = new ViewingService();
