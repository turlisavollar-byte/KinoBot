import type { Movie, Series, Season, Episode, Genre, Actor } from '@workspace/db';

export interface ICatalogRepository {
  // ─── MOVIES ──────────────────────────────────────────────────────────────────
  listMovies(params: {
    page?: number;
    limit?: number;
    search?: string;
    genreId?: number;
    isPublished?: boolean;
  }): Promise<{ data: Movie[]; total: number; page: number; limit: number }>;
  
  getMovieById(id: string): Promise<Movie | null>;
  createMovie(data: Omit<Movie, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { genreIds?: number[] }): Promise<Movie>;
  updateMovie(id: string, data: Partial<Movie> & { genreIds?: number[] }): Promise<Movie>;
  deleteMovie(id: string): Promise<void>;
  publishMovie(id: string, published: boolean): Promise<Movie>;
  
  // ─── SERIES ──────────────────────────────────────────────────────────────────
  listSeries(params: {
    page?: number;
    limit?: number;
    search?: string;
    isPublished?: boolean;
  }): Promise<{ data: Series[]; total: number; page: number; limit: number }>;
  
  getSeriesById(id: string): Promise<Series | null>;
  createSeries(data: Omit<Series, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { genreIds?: number[] }): Promise<Series>;
  updateSeries(id: string, data: Partial<Series> & { genreIds?: number[] }): Promise<Series>;
  deleteSeries(id: string): Promise<void>;
  publishSeries(id: string, published: boolean): Promise<Series>;
  
  // ─── SEASONS ──────────────────────────────────────────────────────────────────
  listSeasons(seriesId: string): Promise<Season[]>;
  createSeason(seriesId: string, data: Omit<Season, 'id' | 'createdAt' | 'deletedAt'>): Promise<Season>;
  updateSeason(id: string, data: Partial<Season>): Promise<Season>;
  deleteSeason(id: string): Promise<void>;
  
  // ─── EPISODES ─────────────────────────────────────────────────────────────────
  listEpisodes(seasonId: string): Promise<Episode[]>;
  createEpisode(seasonId: string, data: Omit<Episode, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Episode>;
  updateEpisode(id: string, data: Partial<Episode>): Promise<Episode>;
  deleteEpisode(id: string): Promise<void>;
  publishEpisode(id: string, published: boolean): Promise<Episode>;
  
  // ─── GENRES ──────────────────────────────────────────────────────────────────
  listGenres(): Promise<Genre[]>;
  getGenreById(id: number): Promise<Genre | null>;
  createGenre(data: Omit<Genre, 'id' | 'deletedAt'>): Promise<Genre>;
  updateGenre(id: number, data: Partial<Genre>): Promise<Genre>;
  deleteGenre(id: number): Promise<void>;
  
  // ─── ACTORS ───────────────────────────────────────────────────────────────────
  listActors(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: Actor[]; total: number; page: number; limit: number }>;
  
  getActorById(id: string): Promise<Actor | null>;
  createActor(data: Omit<Actor, 'id' | 'deletedAt'>): Promise<Actor>;
  updateActor(id: string, data: Partial<Actor>): Promise<Actor>;
  deleteActor(id: string): Promise<void>;
}
