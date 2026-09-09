// modules/user/application/use-cases/list-users.use-case.ts

import { inject, injectable } from 'tsyringe';
import type { IUserRepository, UserFilters, UserPaginationResult } from '../../domain/repositories/user.repository.interface';
import { Logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/errors/AppError';

@injectable()
export class ListUsersUseCase {
  private readonly logger = Logger.getInstance('ListUsersUseCase');

  constructor(
    @inject('IUserRepository')
    private readonly repository: IUserRepository,
  ) {}

  async execute(filters: UserFilters): Promise<UserPaginationResult> {
    const startTime = Date.now();

    // Validate and set defaults
    const validatedFilters = this.validateFilters(filters);

    this.logger.debug('Listing users', { filters: validatedFilters });

    const result = await this.repository.findMany(validatedFilters);

    const duration = Date.now() - startTime;
    this.logger.info('Users listed', {
      count: result.data.length,
      total: result.meta.total,
      page: result.meta.page,
      duration: `${duration}ms`,
    });

    return result;
  }

  private validateFilters(filters: UserFilters): UserFilters {
    const { page = 1, limit = 20, ...rest } = filters;

    return {
      ...rest,
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
      sortBy: rest.sortBy || 'createdAt',
      sortOrder: rest.sortOrder || 'desc',
    };
  }
}