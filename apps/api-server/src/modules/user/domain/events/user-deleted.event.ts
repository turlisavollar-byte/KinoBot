// modules/user/domain/events/user-deleted.event.ts

export class UserDeletedEvent {
  constructor(
    public readonly userId: string,
    public readonly soft: boolean,
    public readonly actorId?: string,
    public readonly timestamp: Date = new Date(),
  ) {}

  get eventName(): string {
    return `user.${this.soft ? 'soft_deleted' : 'permanently_deleted'}`;
  }

  toJSON() {
    return {
      eventName: this.eventName,
      userId: this.userId,
      soft: this.soft,
      actorId: this.actorId,
      timestamp: this.timestamp.toISOString(),
    };
  }
}