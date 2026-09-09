// modules/user/domain/events/user-created.event.ts

import { User } from '../entities/user.entity';

export class UserCreatedEvent {
  constructor(
    public readonly user: User,
    public readonly timestamp: Date = new Date(),
  ) {}

  get eventName(): string {
    return 'user.created';
  }

  toJSON() {
    return {
      eventName: this.eventName,
      userId: this.user.id,
      telegramId: this.user.telegramId,
      username: this.user.username,
      email: this.user.email?.toString(),
      role: this.user.role.toString(),
      timestamp: this.timestamp.toISOString(),
    };
  }
}