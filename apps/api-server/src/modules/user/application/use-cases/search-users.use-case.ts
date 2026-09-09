// modules/user/application/use-cases/search-users.use-case.ts

import { inject, injectable } from 'tsyringe';
import type { IUserRepository, UserPaginationResult } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class SearchUsersUseCase {
  private readonly logger = Logger.getInstance('SearchUsersUseCase');

  constructor(
    @inject('IUserRepository')
    private readonly repository: IUserRepository,
  ) {}

  async execute(
    query: string,
    filters?: {
      status?: string[];
      role?: string[];
      isActive?: boolean;
      isBlocked?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<UserPaginationResult> {
    const startTime = Date.now();

    this.logger.debug('Searching users', { query, filters });

    const result = await this.repository.findMany({
      search: query,
      status: filters?.status as any,
      role: filters?.role as any,
      isActive: filters?.isActive,
      isBlocked: filters?.isBlocked,
      page: filters?.page || 1,
      limit: Math.min(filters?.limit || 20, 100),
    });

    const duration = Date.now() - startTime;
    this.logger.info('Users searched', {
      query,
      count: result.data.length,
      total: result.meta.total,
      duration: `${duration}ms`,
    });

    return result;
  }
}