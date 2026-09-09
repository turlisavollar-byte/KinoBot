import { injectable } from 'tsyringe';
import type { ICatalogRepository } from '../repositories/catalog.repository.interface';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class DeleteMovieUseCase {
  private repository: ICatalogRepository;
  private logger: Logger;

  constructor(repository: ICatalogRepository) {
    this.repository = repository;
    this.logger = Logger.getInstance('DeleteMovieUseCase');
  }

  async execute(id: string) {
    const startTime = Date.now();
    
    try {
      await this.repository.deleteMovie(id);
      
      this.logger.info('Movie deleted successfully', {
        movieId: id,
        duration: `${Date.now() - startTime}ms`,
      });
    } catch (error) {
      this.logger.error('Failed to delete movie', { error, movieId: id });
      throw error;
    }
  }
}
