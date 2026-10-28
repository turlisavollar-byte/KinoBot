"use client";

import { useQuery } from "@tanstack/react-query";
import { content as contentApi } from "@streamx/api-client";
import type {
  ContentItem,
  FeaturedItem,
  MovieDetails,
  SeriesDetails,
  BrowseResponse,
  Episode,
} from "@streamx/api-client";

interface CatalogData {
  trendingMovies: ContentItem[];
  trendingSeries: ContentItem[];
  continueWatching: ContentItem[];
  top10Movies: ContentItem[];
  newReleases: ContentItem[];
  featuredItems: FeaturedItem[];
}

const emptyCatalog: CatalogData = {
  trendingMovies: [],
  trendingSeries: [],
  continueWatching: [],
  top10Movies: [],
  newReleases: [],
  featuredItems: [],
};

export function useCatalog() {
  const { data, isLoading, error } = useQuery<CatalogData>({
    queryKey: ["content", "catalog"],
    queryFn: async (): Promise<CatalogData> => {
      const [movies, series] = await Promise.all([
        contentApi.getMovies(),
        contentApi.listSeries(),
      ]);
      const featuredItems: FeaturedItem[] = movies.slice(0, 5).map((movie) => ({
        id: movie.id,
        title: movie.title,
        description: movie.title,
        image: movie.image,
        backdrop: movie.image,
        year: movie.year ?? 0,
        rating: movie.rating ?? 0,
        duration: movie.duration ?? "",
        genres: movie.genres ?? [],
        type: movie.type,
      }));

      return {
        trendingMovies: movies,
        trendingSeries: series,
        continueWatching: [],
        top10Movies: movies.slice(0, 10),
        newReleases: movies.slice(0, 10),
        featuredItems,
      };
    },
  });

  return {
    data: data ?? emptyCatalog,
    loading: isLoading,
    error:
      error instanceof Error
        ? error.message
        : error
          ? "Failed to load catalog"
          : null,
  };
}

export function useMovieDetails(id: string | null) {
  const { data, isLoading, error } = useQuery<MovieDetails | null>({
    queryKey: ["content", "movie", id],
    queryFn: async (): Promise<MovieDetails | null> => contentApi.getMovie(id!),
    enabled: !!id,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error:
      error instanceof Error
        ? error.message
        : error
          ? "Failed to load movie"
          : null,
  };
}

export function useSeriesDetails(id: string | null) {
  const { data, isLoading, error } = useQuery<SeriesDetails | null>({
    queryKey: ["content", "series", id],
    queryFn: async (): Promise<SeriesDetails | null> =>
      contentApi.getSeriesById(id!),
    enabled: !!id,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error:
      error instanceof Error
        ? error.message
        : error
          ? "Failed to load series"
          : null,
  };
}

export function useBrowse(type?: string, genre?: string) {
  const { data, isLoading, error } = useQuery<BrowseResponse>({
    queryKey: ["content", "browse", type, genre],
    queryFn: async (): Promise<BrowseResponse> =>
      contentApi.browse(type, genre),
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error:
      error instanceof Error
        ? error.message
        : error
          ? "Failed to load content"
          : null,
  };
}

export function useSearch(query: string, type?: string, genre?: string) {
  const { data, isLoading } = useQuery<ContentItem[]>({
    queryKey: ["content", "search", query, type, genre],
    queryFn: async (): Promise<ContentItem[]> =>
      contentApi.search(query, type, genre),
    enabled: query.trim().length > 0,
  });

  return { results: data ?? [], loading: isLoading };
}

export function useVideoData(id: string | null) {
  const { data, isLoading, error } = useQuery<ContentItem | null>({
    queryKey: ["content", "video", id],
    queryFn: async (): Promise<ContentItem | null> => contentApi.getVideo(id!),
    enabled: !!id,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

export function useSeason(
  seriesId: string | null,
  seasonNumber: string | number | null,
) {
  const { data, isLoading, error } = useQuery<{
    series: SeriesDetails;
    episodes: Episode[];
    seasonNumber: number;
  } | null>({
    queryKey: ["content", "season", seriesId, seasonNumber],
    queryFn: async () => contentApi.getSeason(seriesId!, seasonNumber!),
    enabled: !!seriesId && seasonNumber !== null,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

export function useContentItem(id: string | null) {
  const { data, isLoading } = useQuery<ContentItem | null>({
    queryKey: ["content", "item", id],
    queryFn: async (): Promise<ContentItem | null> =>
      contentApi.getContentItem(id!),
    enabled: !!id,
  });

  return { data: data ?? null, loading: isLoading };
}

export function useMovies() {
  const { data, isLoading } = useQuery<ContentItem[]>({
    queryKey: ["content", "movies"],
    queryFn: async (): Promise<ContentItem[]> => contentApi.getMovies(),
  });

  return { movies: data ?? [], loading: isLoading };
}

export function useSeries() {
  const { data, isLoading } = useQuery<ContentItem[]>({
    queryKey: ["content", "series"],
    queryFn: async (): Promise<ContentItem[]> => contentApi.listSeries(),
  });

  return { series: data ?? [], loading: isLoading };
}

export function useAllContent() {
  const { data, isLoading } = useQuery<BrowseResponse>({
    queryKey: ["content", "all"],
    queryFn: async (): Promise<BrowseResponse> => contentApi.browse(),
  });

  const items = data?.items ?? [];
  const lookup = new Map<string, ContentItem>(
    items.map((item) => [item.id, item]),
  );

  return { items, lookup, loading: isLoading };
}
