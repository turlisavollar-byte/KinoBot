import { watchlist as watchlistApi } from "@streamx/api-client";
import type { WatchlistItem, ContentType } from "@streamx/api-client";

export type { WatchlistItem, ContentType };

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  return watchlistApi.list();
}

export async function toggleWatchlistItem(
  contentId: string,
  contentType: ContentType
): Promise<{ action: "added" | "removed"; item?: WatchlistItem }> {
  return watchlistApi.toggle(contentId, contentType);
}

export async function removeFromWatchlist(rowId: string): Promise<void> {
  await watchlistApi.remove(rowId);
}
