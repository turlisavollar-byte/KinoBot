import { injectable } from 'tsyringe';
import type { ICatalogRepository } from '../repositories/catalog.repository.interface';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class ListMoviesUseCase {
  private repository: ICatalogRepository;
  private logger: Logger;

  constructor(repository: ICatalogRepository) {
    this.repository = repository;
    this.logger = Logger.getInstance('ListMoviesUseCase');
  }

  async execute(params: {
    page?: number;
    limit?: number;
    search?: string;
    genreId?: number;
    isPublished?: boolean;
  }) {
    const startTime = Date.now();
    
    try {
      const result = await this.repository.listMovies(params);
      
      this.logger.info('Movies listed successfully', {
        count: result.data.length,
        total: result.total,
        duration: `${Date.now() - startTime}ms`,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to list movies', { error });
      throw error;
    }
  }
}
