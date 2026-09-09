import type { INotificationRepository } from '../repositories/notification.repository.interface';

export class MarkAllReadUseCase {
  constructor(private readonly repository: INotificationRepository) {}

  async execute(userId: string): Promise<void> {
    await this.repository.markAllRead(userId);
  }
}
