// modules/user/application/use-cases/export-users.use-case.ts

import { inject, injectable } from 'tsyringe';
import type { IUserRepository, UserFilters } from '../../domain/repositories/user.repository.interface';
import { Logger } from '@/shared/utils/logger';

@injectable()
export class ExportUsersUseCase {
  private readonly logger = Logger.getInstance('ExportUsersUseCase');

  constructor(
    @inject('IUserRepository')
    private readonly repository: IUserRepository,
  ) {}

  async execute(filters: UserFilters, format: 'json' | 'csv'): Promise<{
    data: string;
    filename: string;
    contentType: string;
  }> {
    const startTime = Date.now();

    // Get all users (unlimited)
    const { data: users } = await this.repository.findMany({
      ...filters,
      limit: 10000, // Max export limit
      page: 1,
    });

    const userData = users.map(user => user.toPublicData());

    let data: string;
    let filename: string;
    let contentType: string;

    if (format === 'json') {
      data = JSON.stringify(userData, null, 2);
      filename = `users-export-${new Date().toISOString().split('T')[0]}.json`;
      contentType = 'application/json';
    } else {
      // CSV export without external dependency
      const headers = ['ID', 'Telegram ID', 'Username', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status', 'Active', 'Blocked', 'Created At', 'Last Login'];
      const rows = userData.map(user => [
        user.id,
        user.telegramId,
        user.username || '',
        user.firstName || '',
        user.lastName || '',
        user.email || '',
        user.phone || '',
        user.role,
        user.status,
        user.isActive,
        user.isBlocked,
        user.createdAt,
        user.lastLoginAt || '',
      ]);

      // Escape CSV values
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvLines = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(',')),
      ];

      data = csvLines.join('\n');
      filename = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      contentType = 'text/csv';
    }

    const duration = Date.now() - startTime;
    this.logger.info('Users exported', {
      format,
      count: users.length,
      duration: `${duration}ms`,
    });

    return { data, filename, contentType };
  }
}