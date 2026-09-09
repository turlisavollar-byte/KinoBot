import { injectable } from 'tsyringe';
import type { ICatalogRepository } from '../repositories/catalog.repository.interface';
import type { Movie } from '@workspace/db';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class CreateMovieUseCase {
  private repository: ICatalogRepository;
  private logger: Logger;

  constructor(repository: ICatalogRepository) {
    this.repository = repository;
    this.logger = Logger.getInstance('CreateMovieUseCase');
  }

  async execute(data: Omit<Movie, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { genreIds?: number[] }) {
    const startTime = Date.now();
    
    try {
      const movie = await this.repository.createMovie(data);
      
      this.logger.info('Movie created successfully', {
        movieId: movie.id,
        title: movie.title,
        duration: `${Date.now() - startTime}ms`,
      });

      return movie;
    } catch (error) {
      this.logger.error('Failed to create movie', { error });
      throw error;
    }
  }
}
