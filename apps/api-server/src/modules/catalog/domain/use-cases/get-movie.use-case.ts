import { injectable } from 'tsyringe';
import type { ICatalogRepository } from '../repositories/catalog.repository.interface';
import { Logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/errors/AppError';

@injectable()
export class GetMovieUseCase {
  private repository: ICatalogRepository;
  private logger: Logger;

  constructor(repository: ICatalogRepository) {
    this.repository = repository;
    this.logger = Logger.getInstance('GetMovieUseCase');
  }

  async execute(id: string) {
    const startTime = Date.now();
    
    try {
      const movie = await this.repository.getMovieById(id);
      
      if (!movie) {
        throw AppError.notFound('Movie', id);
      }

      this.logger.info('Movie retrieved successfully', {
        movieId: id,
        duration: `${Date.now() - startTime}ms`,
      });

      return movie;
    } catch (error) {
      this.logger.error('Failed to get movie', { error, movieId: id });
      throw error;
    }
  }
}
