// modules/user/domain/events/user-blocked.event.ts

export class UserBlockedEvent {
  constructor(
    public readonly userId: string,
    public readonly blocked: boolean,
    public readonly reason?: string,
    public readonly actorId?: string,
    public readonly timestamp: Date = new Date(),
  ) {}

  get eventName(): string {
    return `user.${this.blocked ? 'blocked' : 'unblocked'}`;
  }

  toJSON() {
    return {
      eventName: this.eventName,
      userId: this.userId,
      blocked: this.blocked,
      reason: this.reason,
      actorId: this.actorId,
      timestamp: this.timestamp.toISOString(),
    };
  }
}