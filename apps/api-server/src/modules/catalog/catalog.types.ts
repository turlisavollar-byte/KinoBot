export type ContentStatus = "draft" | "published" | "archived";
export type ContentType = "movie" | "series";

export interface ContentFilters {
  search?: string;
  genreId?: string;
  isPublished?: boolean;
  yearFrom?: number;
  yearTo?: number;
  page?: number;
  limit?: number;
}

export interface CreateMovieDTO {
  title: string;
  originalTitle?: string;
  description?: string;
  releaseYear?: number;
  durationMinutes?: number;
  language?: string;
  genreIds?: string[];
  actorIds?: string[];
  thumbnailUrl?: string;
  telegramFileId?: string;
  isPublished?: boolean;
}

export interface CreateSeriesDTO {
  title: string;
  originalTitle?: string;
  description?: string;
  releaseYear?: number;
  language?: string;
  genreIds?: string[];
  actorIds?: string[];
  thumbnailUrl?: string;
  isPublished?: boolean;
}
