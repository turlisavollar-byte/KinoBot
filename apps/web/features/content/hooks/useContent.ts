"use client";

import { useQuery } from "@tanstack/react-query";
import { content as contentApi } from "@streamx/api-client";
import type { ContentItem, FeaturedItem, MovieDetails, SeriesDetails, BrowseResponse, Episode } from "@streamx/api-client";

interface CatalogData {
  trendingMovies: ContentItem[];
  trendingSeries: ContentItem[];
  continueWatching: ContentItem[];
  top10Movies: ContentItem[];
  newReleases: ContentItem[];
  featuredItems: FeaturedItem[];
}

export function useCatalog() {
  const { data, isLoading, error } = useQuery<CatalogData>({
    queryKey: ["content", "catalog"],
    queryFn: (): CatalogData => contentApi.getCatalog(),
  });

  return { data: data ?? null, loading: isLoading, error: error instanceof Error ? error.message : error ? "Failed to load catalog" : null };
}

export function useMovieDetails(id: string | null) {
  const { data, isLoading, error } = useQuery<MovieDetails | null>({
    queryKey: ["content", "movie", id],
    queryFn: (): MovieDetails | null => contentApi.getMovie(id!),
    enabled: !!id,
  });

  return { data: data ?? null, loading: isLoading, error: error instanceof Error ? error.message : error ? "Failed to load movie" : null };
}

export function useSeriesDetails(id: string | null) {
  const { data, isLoading, error } = useQuery<SeriesDetails | null>({
    queryKey: ["content", "series", id],
    queryFn: (): SeriesDetails | null => contentApi.getSeriesById(id!),
    enabled: !!id,
  });

  return { data: data ?? null, loading: isLoading, error: error instanceof Error ? error.message : error ? "Failed to load series" : null };
}

export function useBrowse(type?: string, genre?: string) {
  const { data, isLoading, error } = useQuery<BrowseResponse>({
    queryKey: ["content", "browse", type, genre],
    queryFn: (): BrowseResponse => contentApi.browse(type, genre),
  });

  return { data: data ?? null, loading: isLoading, error: error instanceof Error ? error.message : error ? "Failed to load content" : null };
}

export function useSearch(query: string, type?: string, genre?: string) {
  const { data, isLoading } = useQuery<ContentItem[]>({
    queryKey: ["content", "search", query, type, genre],
    queryFn: (): ContentItem[] => contentApi.search(query, type, genre),
    enabled: query.trim().length > 0,
  });

  return { results: data ?? [], loading: isLoading };
}

export function useVideoData(id: string | null) {
  const { data, isLoading, error } = useQuery<ContentItem | null>({
    queryKey: ["content", "video", id],
    queryFn: (): ContentItem | null => contentApi.getVideo(id!),
    enabled: !!id,
  });

  return { data: data ?? null, loading: isLoading, error: error instanceof Error ? error.message : null };
}

export function useSeason(seriesId: string | null, seasonNumber: string | number | null) {
  const { data, isLoading, error } = useQuery<{ series: SeriesDetails; episodes: Episode[]; seasonNumber: number } | null>({
    queryKey: ["content", "season", seriesId, seasonNumber],
    queryFn: () => contentApi.getSeason(seriesId!, seasonNumber!),
    enabled: !!seriesId && seasonNumber !== null,
  });

  return { data: data ?? null, loading: isLoading, error: error instanceof Error ? error.message : null };
}

export function useContentItem(id: string | null) {
  const { data, isLoading } = useQuery<ContentItem | null>({
    queryKey: ["content", "item", id],
    queryFn: (): ContentItem | null => contentApi.getContentItem(id!),
    enabled: !!id,
  });

  return { data: data ?? null, loading: isLoading };
}

export function useMovies() {
  const { data, isLoading } = useQuery<ContentItem[]>({
    queryKey: ["content", "movies"],
    queryFn: (): ContentItem[] => contentApi.getMovies(),
  });

  return { movies: data ?? [], loading: isLoading };
}

export function useSeries() {
  const { data, isLoading } = useQuery<ContentItem[]>({
    queryKey: ["content", "series"],
    queryFn: (): ContentItem[] => contentApi.listSeries(),
  });

  return { series: data ?? [], loading: isLoading };
}

export function useAllContent() {
  const { data, isLoading } = useQuery<BrowseResponse>({
    queryKey: ["content", "all"],
    queryFn: (): BrowseResponse => contentApi.browse(),
  });

  const items = data?.items ?? [];
  const lookup = new Map<string, ContentItem>(items.map((item) => [item.id, item]));

  return { items, lookup, loading: isLoading };
}
