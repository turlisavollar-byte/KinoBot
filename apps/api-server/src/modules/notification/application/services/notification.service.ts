import type { DrizzleNotificationsRepository } from "../../infrastructure/repositories/drizzle-notifications.repository";
import type { NotificationEntity } from "../../domain/entities/notification.entity";

export interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

function toNotificationDto(notification: NotificationEntity): NotificationDto {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export class NotificationService {
  constructor(private readonly repo: DrizzleNotificationsRepository) {}

  async listNotifications(userId: string, page: number, limit: number) {
    const result = await this.repo.findByUser(userId, page, limit);
    return {
      data: result.data.map((notification) => toNotificationDto(notification)),
      meta: result.meta,
    };
  }

  async markRead(id: string, userId: string): Promise<NotificationDto> {
    const existing = await this.repo.findByIdAndUser(id, userId);
    if (!existing) throw new Error("Notification not found");

    const updated = await this.repo.markRead(id);
    if (!updated) throw new Error("Notification not found");
    return toNotificationDto(updated);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.markAllRead(userId);
  }
}
