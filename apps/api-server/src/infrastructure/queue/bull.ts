/**
 * Job queue — STUB
 *
 * TODO: Install bullmq and configure Redis for queue backend.
 *   pnpm --filter @workspace/api-server add bullmq
 *
 * Planned queues:
 *   - email-notifications
 *   - telegram-broadcasts
 *   - subscription-renewals
 *   - analytics-events
 *   - media-transcoding
 */

import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("BullQueue");

export interface JobQueue {
  add<T>(name: string, data: T, opts?: { delay?: number; attempts?: number }): Promise<void>;
}

export type QueueName =
  | "email-notifications"
  | "telegram-broadcasts"
  | "subscription-renewals"
  | "analytics-events"
  | "media-transcoding";

class SyncQueue implements JobQueue {
  private handlers = new Map<string, (data: unknown) => Promise<void>>();

  async add<T>(name: string, data: T): Promise<void> {
    const handler = this.handlers.get(name);
    if (handler) {
      handler(data).catch((err) => logger.error("Queue job failed", { err, name }));
    } else {
      logger.warn("Queue: no handler registered, job dropped (stub mode)", { name });
    }
  }

  register<T>(name: string, handler: (data: T) => Promise<void>): void {
    this.handlers.set(name, handler as (data: unknown) => Promise<void>);
  }
}

export const queue = new SyncQueue();

logger.info("Queue: using synchronous stub. Wire BullMQ for production.");
