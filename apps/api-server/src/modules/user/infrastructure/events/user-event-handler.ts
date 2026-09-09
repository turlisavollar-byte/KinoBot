// modules/user/infrastructure/events/user-event-handler.ts

import { EventEmitter } from 'events';
import { Logger } from '@/shared/utils/logger';
import { UserCreatedEvent } from '../../domain/events/user-created.event';
import { UserUpdatedEvent } from '../../domain/events/user-updated.event';
import { UserBlockedEvent } from '../../domain/events/user-blocked.event';
import { UserDeletedEvent } from '../../domain/events/user-deleted.event';

export class UserEventHandler extends EventEmitter {
  private readonly logger = Logger.getInstance('UserEventHandler');

  constructor() {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.on('user.created', this.handleUserCreated.bind(this));
    this.on('user.updated', this.handleUserUpdated.bind(this));
    this.on('user.blocked', this.handleUserBlocked.bind(this));
    this.on('user.deleted', this.handleUserDeleted.bind(this));
  }

  private async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      this.logger.info('User created event', { userId: event.user.id, username: event.user.username });
      
      // TODO: Add side effects like:
      // - Send welcome email
      // - Create default user profile
      // - Initialize user stats
      // - Send notification to admin
      // - Track analytics
      
      this.emit('user.created.handled', event);
    } catch (error) {
      this.logger.error('Failed to handle user created event', { error, event });
      this.emit('user.created.failed', { event, error });
    }
  }

  private async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
    try {
      this.logger.info('User updated event', { userId: event.user.id, changes: event.changes });
      
      // TODO: Add side effects like:
      // - Invalidate cache
      // - Send notification if profile changed
      // - Update search index
      // - Audit logging
      
      this.emit('user.updated.handled', event);
    } catch (error) {
      this.logger.error('Failed to handle user updated event', { error, event });
      this.emit('user.updated.failed', { event, error });
    }
  }

  private async handleUserBlocked(event: UserBlockedEvent): Promise<void> {
    try {
      this.logger.info('User blocked event', { userId: event.userId, blocked: event.blocked, reason: event.reason });
      
      // TODO: Add side effects like:
      // - Revoke active sessions
      // - Send notification to user
      // - Send alert to admin
      // - Cancel active subscriptions
      // - Audit logging
      
      this.emit('user.blocked.handled', event);
    } catch (error) {
      this.logger.error('Failed to handle user blocked event', { error, event });
      this.emit('user.blocked.failed', { event, error });
    }
  }

  private async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
    try {
      this.logger.info('User deleted event', { userId: event.userId, soft: event.soft });
      
      // TODO: Add side effects like:
      // - Invalidate all user data
      // - Cancel subscriptions
      // - Send confirmation to user
      // - Archive user data for compliance
      // - Audit logging
      
      this.emit('user.deleted.handled', event);
    } catch (error) {
      this.logger.error('Failed to handle user deleted event', { error, event });
      this.emit('user.deleted.failed', { event, error });
    }
  }

  // Public methods to publish events
  publishUserCreated(event: UserCreatedEvent): void {
    this.emit('user.created', event);
  }

  publishUserUpdated(event: UserUpdatedEvent): void {
    this.emit('user.updated', event);
  }

  publishUserBlocked(event: UserBlockedEvent): void {
    this.emit('user.blocked', event);
  }

  publishUserDeleted(event: UserDeletedEvent): void {
    this.emit('user.deleted', event);
  }
}

// Singleton instance
export const userEventHandler = new UserEventHandler();