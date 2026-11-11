import { history as historyApi } from "@streamx/api-client";
import type { HistoryItem, ContentType } from "@streamx/api-client";

export type { HistoryItem, ContentType };

export async function fetchWatchHistory(): Promise<HistoryItem[]> {
  return historyApi.list();
}

export async function upsertWatchHistory(
  contentId: string,
  contentType: ContentType,
  progress: number,
  episode?: string | null
): Promise<void> {
  await historyApi.upsert(contentId, contentType, progress, episode);
}

export async function deleteWatchHistoryRow(rowId: string): Promise<void> {
  await historyApi.remove(rowId);
}

export async function clearWatchHistory(): Promise<void> {
  await historyApi.clear();
}
