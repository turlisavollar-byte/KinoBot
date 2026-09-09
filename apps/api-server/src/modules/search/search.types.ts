export type SearchEntityType = "movie" | "series" | "actor" | "genre";

export interface SearchQuery {
  q: string;
  types?: SearchEntityType[];
  genres?: string[];
  yearFrom?: number;
  yearTo?: number;
  ratingMin?: number;
  language?: string;
  page?: number;
  limit?: number;
}

export interface SearchResultItem {
  id: string;
  type: SearchEntityType;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  releaseYear?: number;
  rating?: number;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  took: number;
}
