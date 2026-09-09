// modules/user/application/use-cases/get-user.use-case.ts

import { inject, injectable } from 'tsyringe';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import type { UserCacheService } from '../services/user-cache.service';
import { User } from '../../domain/entities/user.entity';
import { Logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';

@injectable()
export class GetUserUseCase {
  private readonly logger = Logger.getInstance('GetUserUseCase');

  constructor(
    @inject('IUserRepository')
    private readonly repository: IUserRepository,
    @inject('UserCacheService')
    private readonly cache: UserCacheService,
  ) {}

  async execute(id: string, includeDeleted: boolean = false): Promise<User> {
    const startTime = Date.now();

    // Try cache first
    const cached = await this.cache.get(id);
    if (cached && !cached.isDeleted) {
      this.logger.debug('User from cache', { id });
      return cached;
    }

    // Get from repository
    const user = await this.repository.findById(id);
    if (!user) {
      throw new AppError(`User with id ${id} not found`, 404, ErrorCodes.NOT_FOUND);
    }

    if (user.isDeleted && !includeDeleted) {
      throw new AppError(`User with id ${id} not found`, 404, ErrorCodes.NOT_FOUND);
    }

    // Cache user
    await this.cache.set(id, user);

    const duration = Date.now() - startTime;
    this.logger.info('User retrieved', {
      id,
      duration: `${duration}ms`,
    });

    return user;
  }
}