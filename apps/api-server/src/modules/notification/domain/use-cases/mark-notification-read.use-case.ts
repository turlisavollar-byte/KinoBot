import type { INotificationRepository } from '../repositories/notification.repository.interface';

export class MarkNotificationReadUseCase {
  constructor(private readonly repository: INotificationRepository) {}

  async execute(id: string, userId: string): Promise<{
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
  }> {
    const existing = await this.repository.findByIdAndUser(id, userId);
    if (!existing) {
      throw new Error('Notification not found');
    }

    const updated = await this.repository.markRead(id);
    if (!updated) {
      throw new Error('Notification not found');
    }

    return {
      id: updated.id,
      userId: updated.userId,
      type: updated.type,
      title: updated.title,
      message: updated.message,
      isRead: updated.isRead,
      readAt: updated.readAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
