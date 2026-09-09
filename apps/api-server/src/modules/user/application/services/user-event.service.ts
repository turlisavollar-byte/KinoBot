// modules/user/application/services/user-event.service.ts

import { inject, injectable } from 'tsyringe';
import { EventEmitter } from 'events';
import { Logger } from '@/shared/utils/logger';

export interface UserEvent {
  type: string;
  userId: string;
  actorId?: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

@injectable()
export class UserEventService {
  private readonly logger = Logger.getInstance('UserEventService');
  private readonly emitter = new EventEmitter();

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    // Log all events
    this.emitter.on('*', (event: UserEvent) => {
      this.logger.debug('User event received', { event });
    });

    // Error handling
    this.emitter.on('error', (error: Error) => {
      this.logger.error('User event error', { error });
    });
  }

  async emit(type: string, data: Partial<UserEvent>): Promise<void> {
    const event: UserEvent = {
      type,
      userId: data.userId || '',
      actorId: data.actorId,
      data: data.data,
      timestamp: data.timestamp || new Date(),
    };

    try {
      this.emitter.emit(type, event);
      this.emitter.emit('*', event);
    } catch (error) {
      this.logger.error('Failed to emit event', { type, error });
    }
  }

  on(type: string, listener: (event: UserEvent) => void): void {
    this.emitter.on(type, listener);
  }

  once(type: string, listener: (event: UserEvent) => void): void {
    this.emitter.once(type, listener);
  }

  off(type: string, listener: (event: UserEvent) => void): void {
    this.emitter.off(type, listener);
  }

  removeAllListeners(type?: string): void {
    if (type) {
      this.emitter.removeAllListeners(type);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}