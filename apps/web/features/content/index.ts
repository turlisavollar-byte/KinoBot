export { useWatchlist } from "./hooks/useWatchlist";
export { useWatchHistory } from "./hooks/useWatchHistory";
export {
  useCatalog,
  useMovieDetails,
  useSeriesDetails,
  useBrowse,
  useSearch,
  useVideoData,
  useSeason,
  useContentItem,
  useAllContent,
  useMovies,
  useSeries,
} from "./hooks/useContent";

export type {
  ContentItem,
  ContentType,
  CastMember,
  Episode,
  MovieDetails,
  SeriesDetails,
  FeaturedItem,
  BrowseResponse,
  CatalogData,
} from "./types";
