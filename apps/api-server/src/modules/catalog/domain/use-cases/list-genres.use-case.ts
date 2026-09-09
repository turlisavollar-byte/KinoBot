import { injectable } from 'tsyringe';
import type { ICatalogRepository } from '../repositories/catalog.repository.interface';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class ListGenresUseCase {
  private repository: ICatalogRepository;
  private logger: Logger;

  constructor(repository: ICatalogRepository) {
    this.repository = repository;
    this.logger = Logger.getInstance('ListGenresUseCase');
  }

  async execute() {
    const startTime = Date.now();
    
    try {
      const genres = await this.repository.listGenres();
      
      this.logger.info('Genres listed successfully', {
        count: genres.length,
        duration: `${Date.now() - startTime}ms`,
      });

      return genres;
    } catch (error) {
      this.logger.error('Failed to list genres', { error });
      throw error;
    }
  }
}
