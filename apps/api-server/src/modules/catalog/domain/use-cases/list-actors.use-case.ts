import { injectable } from 'tsyringe';
import type { ICatalogRepository } from '../repositories/catalog.repository.interface';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class ListActorsUseCase {
  private repository: ICatalogRepository;
  private logger: Logger;

  constructor(repository: ICatalogRepository) {
    this.repository = repository;
    this.logger = Logger.getInstance('ListActorsUseCase');
  }

  async execute(params: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const startTime = Date.now();
    
    try {
      const result = await this.repository.listActors(params);
      
      this.logger.info('Actors listed successfully', {
        count: result.data.length,
        total: result.total,
        duration: `${Date.now() - startTime}ms`,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to list actors', { error });
      throw error;
    }
  }
}
