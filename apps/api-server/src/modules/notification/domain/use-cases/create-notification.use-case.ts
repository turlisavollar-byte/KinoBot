import type { INotificationRepository } from '../repositories/notification.repository.interface';
import { NotificationEntity } from '../entities/notification.entity';

export class CreateNotificationUseCase {
  constructor(private readonly repository: INotificationRepository) {}

  async execute(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<NotificationEntity> {
    const notification = NotificationEntity.create({
      userId: data.userId,
      type: data.type as any,
      title: data.title,
      message: data.message,
      data: data.data,
    });
    
    return await this.repository.create(notification);
  }
}
