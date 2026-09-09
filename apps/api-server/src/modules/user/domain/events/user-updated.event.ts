// modules/user/domain/events/user-updated.event.ts

import { User } from '../entities/user.entity';

export class UserUpdatedEvent {
  constructor(
    public readonly user: User,
    public readonly changes: Record<string, unknown>,
    public readonly actorId?: string,
    public readonly timestamp: Date = new Date(),
  ) {}

  get eventName(): string {
    return 'user.updated';
  }

  toJSON() {
    return {
      eventName: this.eventName,
      userId: this.user.id,
      changes: this.changes,
      actorId: this.actorId,
      timestamp: this.timestamp.toISOString(),
    };
  }
}