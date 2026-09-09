import { injectable } from 'tsyringe';
import type { ICatalogRepository } from '../repositories/catalog.repository.interface';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class ListSeriesUseCase {
  private repository: ICatalogRepository;
  private logger: Logger;

  constructor(repository: ICatalogRepository) {
    this.repository = repository;
    this.logger = Logger.getInstance('ListSeriesUseCase');
  }

  async execute(params: {
    page?: number;
    limit?: number;
    search?: string;
    isPublished?: boolean;
  }) {
    const startTime = Date.now();
    
    try {
      const result = await this.repository.listSeries(params);
      
      this.logger.info('Series listed successfully', {
        count: result.data.length,
        total: result.total,
        duration: `${Date.now() - startTime}ms`,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to list series', { error });
      throw error;
    }
  }
}
