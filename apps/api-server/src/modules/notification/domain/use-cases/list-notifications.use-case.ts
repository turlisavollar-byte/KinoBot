import type { INotificationRepository, NotificationFilters } from '../repositories/notification.repository.interface';

export class ListNotificationsUseCase {
  constructor(private readonly repository: INotificationRepository) {}

  async execute(filters: NotificationFilters): Promise<{
    data: any[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const result = await this.repository.findMany(filters);

    return {
      data: result.data.map(n => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        readAt: n.readAt?.toISOString() || null,
        createdAt: n.createdAt.toISOString(),
      })),
      meta: result.meta,
    };
  }
}
