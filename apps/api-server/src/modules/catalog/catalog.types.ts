export type ContentStatus = "draft" | "published" | "archived";
export type ContentType = "movie" | "series";

export interface ActorDetail {
  id: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  movies: Array<{
    movieId: string;
    title: string;
    releaseYear: number | null;
    posterUrl: string | null;
    role: string | null;
    videoCodes: Array<{
      id: string;
      code: string;
      status: string;
    }>;
  }>;
  stats: {
    moviesCount: number;
    totalViews: number;
  };
}

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
