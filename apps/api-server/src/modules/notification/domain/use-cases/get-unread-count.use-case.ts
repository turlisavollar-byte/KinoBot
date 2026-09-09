import type { INotificationRepository } from '../repositories/notification.repository.interface';

export class GetUnreadCountUseCase {
  constructor(private readonly repository: INotificationRepository) {}

  async execute(userId: string): Promise<{ count: number }> {
    const count = await this.repository.getUnreadCount(userId);
    return { count };
  }
}
