/**
 * Job queue using BullMQ
 *
 * Planned queues:
 *   - email-notifications
 *   - telegram-broadcasts
 *   - subscription-renewals
 *   - analytics-events
 *   - media-transcoding
 */

import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("BullQueue");

export interface JobQueue {
  add<T>(name: string, data: T, opts?: { delay?: number; attempts?: number }): Promise<void>;
  register<T>(name: string, handler: (data: T) => Promise<void>): void;
  process(queueName: string): void;
  close(): Promise<void>;
}

export type QueueName =
  | "email-notifications"
  | "telegram-broadcasts"
  | "subscription-renewals"
  | "analytics-events"
  | "media-transcoding";

class BullMQQueue implements JobQueue {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private handlers: Map<string, (data: unknown) => Promise<void>> = new Map();
  private connection: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.connection = new Redis(redisUrl);

    this.connection.on("connect", () => {
      logger.info("BullMQ Redis connected successfully");
    });

    this.connection.on("error", (error) => {
      logger.error("BullMQ Redis connection error:", undefined, error);
    });
  }

  private getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: this.connection,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        },
      });

      queue.on("error", (error) => {
        logger.error(`Queue ${queueName} error:`, undefined, error);
      });

      this.queues.set(queueName, queue);
    }

    return this.queues.get(queueName)!;
  }

  async add<T>(
    name: string,
    data: T,
    opts?: { delay?: number; attempts?: number }
  ): Promise<void> {
    try {
      const queue = this.getQueue(name);
      await queue.add(name, data, {
        delay: opts?.delay,
        attempts: opts?.attempts,
      });
      logger.debug(`Job added to queue ${name}`);
    } catch (error) {
      logger.error(`Failed to add job to queue ${name}:`, undefined, error);
      throw error;
    }
  }

  register<T>(name: string, handler: (data: T) => Promise<void>): void {
    this.handlers.set(name, handler as (data: unknown) => Promise<void>);
  }

  process(queueName: string): void {
    if (this.workers.has(queueName)) {
      logger.warn(`Worker for queue ${queueName} already exists`);
      return;
    }

    const handler = this.handlers.get(queueName);
    if (!handler) {
      logger.warn(`No handler registered for queue ${queueName}`);
      return;
    }

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        try {
          await handler(job.data);
          logger.debug(`Job ${job.id} completed successfully in queue ${queueName}`);
        } catch (error) {
          logger.error(`Job ${job.id} failed in queue ${queueName}:`, undefined, error);
          throw error;
        }
      },
      {
        connection: this.connection,
        concurrency: 5,
      }
    );

    worker.on("error", (error) => {
      logger.error(`Worker error for queue ${queueName}:`, undefined, error);
    });

    worker.on("completed", (job) => {
      logger.debug(`Job ${job.id} completed in queue ${queueName}`);
    });

    worker.on("failed", (job, error) => {
      logger.error(`Job ${job?.id} failed in queue ${queueName}:`, undefined, error);
    });

    this.workers.set(queueName, worker);
    logger.info(`Worker started for queue ${queueName}`);
  }

  async close(): Promise<void> {
    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.info(`Worker closed for queue ${name}`);
    }

    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue closed: ${name}`);
    }

    await this.connection.quit();
    logger.info("BullMQ connection closed");
  }
}

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

  process(queueName: string): void {
    // Sync queue doesn't need processing
  }

  async close(): Promise<void> {
    // Nothing to close for sync queue
  }
}

// Use BullMQ if REDIS_URL is configured, otherwise use sync queue
export const queue: JobQueue = process.env.REDIS_URL
  ? new BullMQQueue()
  : new SyncQueue();

if (process.env.REDIS_URL) {
  logger.info("Queue: using BullMQ with Redis");
} else {
  logger.info("Queue: using synchronous stub (no REDIS_URL configured)");
}
