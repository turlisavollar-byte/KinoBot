export type ContentType = "movie" | "series";
export type PlanId = "basic" | "standard" | "premium";
export type BillingCycle = "monthly" | "yearly";

export interface User {
  id: string;
  email: string | undefined;
  fullName: string | null;
  avatarUrl: string | null;
  plan: PlanId;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  user: User;
}

export interface Profile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  plan: PlanId;
  createdAt: string;
}

export interface ContentItem {
  id: string;
  title: string;
  image: string;
  year?: number;
  rating?: number;
  duration?: string;
  type: ContentType;
  genres?: string[];
}

export interface WatchlistItem {
  id: string;
  contentId: string;
  contentType: ContentType;
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  contentId: string;
  contentType: ContentType;
  progress: number;
  episode: string | null;
  watchedAt: string;
}

export interface Subscription {
  id: string;
  planId: PlanId;
  billingCycle: BillingCycle;
  createdAt: string;
}

export interface UserStats {
  moviesWatched: number;
  seriesWatched: number;
  hoursWatched: number;
  watchlist: number;
}

export interface ToggleWatchlistResponse {
  action: "added" | "removed";
  item?: WatchlistItem;
}

export interface CastMember {
  id: string;
  name: string;
  role: string;
  image: string;
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  duration: string;
  image: string;
  description: string;
}

export interface VideoSource {
  url: string;
  quality: string;
}

export interface MovieDetails extends ContentItem {
  description: string;
  backdrop: string;
  poster: string;
  genres: string[];
  director: string;
  cast: CastMember[];
  language: string;
  releaseDate: string;
  budget?: string;
  similar?: ContentItem[];
}

export interface SeriesDetails extends ContentItem {
  description: string;
  backdrop: string;
  poster: string;
  seasons: number;
  episodes: number;
  genres: string[];
  creator: string;
  cast: CastMember[];
  language: string;
  releaseDate: string;
  status: string;
  episodesList?: Episode[];
  similar?: ContentItem[];
}

export interface FeaturedItem {
  id: string;
  title: string;
  description: string;
  image: string;
  backdrop: string;
  year: number;
  rating: number;
  duration: string;
  genres: string[];
  type: ContentType;
}

export interface BrowseResponse {
  items: ContentItem[];
  filters: { genres: string[]; years: string[] };
}

export interface VideoData {
  id: string;
  title: string;
  year: number;
  duration: string;
  thumbnail: string;
  type: ContentType;
}

export interface CatalogData {
  trendingMovies: ContentItem[];
  trendingSeries: ContentItem[];
  continueWatching: ContentItem[];
  top10Movies: ContentItem[];
  newReleases: ContentItem[];
  featuredItems: FeaturedItem[];
}
