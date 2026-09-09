import { injectable } from 'tsyringe';
import type { ICatalogRepository } from '../repositories/catalog.repository.interface';
import type { Movie } from '@workspace/db';
import { Logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/errors/AppError';

@injectable()
export class UpdateMovieUseCase {
  private repository: ICatalogRepository;
  private logger: Logger;

  constructor(repository: ICatalogRepository) {
    this.repository = repository;
    this.logger = Logger.getInstance('UpdateMovieUseCase');
  }

  async execute(id: string, data: Partial<Movie> & { genreIds?: number[] }) {
    const startTime = Date.now();
    
    try {
      const movie = await this.repository.updateMovie(id, data);
      
      this.logger.info('Movie updated successfully', {
        movieId: id,
        duration: `${Date.now() - startTime}ms`,
      });

      return movie;
    } catch (error) {
      this.logger.error('Failed to update movie', { error, movieId: id });
      throw error;
    }
  }
}
