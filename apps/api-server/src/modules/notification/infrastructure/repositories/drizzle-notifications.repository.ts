import { and, asc, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db, notifications } from "@workspace/db";
import type {
  INotificationRepository,
  NotificationFilters,
  NotificationPaginationResult,
} from "../../domain/repositories/notification.repository.interface";
import {
  NotificationEntity,
  type NotificationType,
} from "../../domain/entities/notification.entity";

export class DrizzleNotificationsRepository implements INotificationRepository {
  async findById(id: string): Promise<NotificationEntity | null> {
    const [row] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return row ? this.toEntity(row) : null;
  }

  async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<NotificationEntity | null> {
    const [row] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);
    return row ? this.toEntity(row) : null;
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<NotificationPaginationResult> {
    return this.findMany({ userId, page, limit });
  }

  async findMany(
    filters: NotificationFilters,
  ): Promise<NotificationPaginationResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const conditions = [];
    if (filters.userId)
      conditions.push(eq(notifications.userId, filters.userId));
    if (filters.isRead !== undefined)
      conditions.push(eq(notifications.isRead, filters.isRead));
    if (filters.type?.length)
      conditions.push(inArray(notifications.type, filters.type));
    if (filters.startDate)
      conditions.push(gte(notifications.createdAt, filters.startDate));
    if (filters.endDate)
      conditions.push(lte(notifications.createdAt, filters.endDate));
    const where = conditions.length ? and(...conditions) : undefined;
    const [{ total }] = await db
      .select({ total: count() })
      .from(notifications)
      .where(where);
    const rows = await db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const totalPages = Math.ceil(Number(total) / limit);

    return {
      data: rows.map((row) => this.toEntity(row)),
      meta: {
        total: Number(total),
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async findAll(
    filters?: Partial<NotificationFilters>,
  ): Promise<NotificationEntity[]> {
    const conditions = [];
    if (filters?.userId)
      conditions.push(eq(notifications.userId, filters.userId));
    if (filters?.isRead !== undefined)
      conditions.push(eq(notifications.isRead, filters.isRead));
    const rows = await db
      .select()
      .from(notifications)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(notifications.createdAt));
    return rows.map((row) => this.toEntity(row));
  }

  async create(notification: NotificationEntity): Promise<NotificationEntity> {
    const [row] = await db
      .insert(notifications)
      .values(this.toPersistence(notification))
      .returning();
    return this.toEntity(row);
  }

  async update(notification: NotificationEntity): Promise<NotificationEntity> {
    const [row] = await db
      .update(notifications)
      .set({
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        readAt: notification.readAt ?? null,
      })
      .where(eq(notifications.id, notification.id))
      .returning();
    if (!row) throw new Error("Notification not found");
    return this.toEntity(row);
  }

  async delete(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async markRead(id: string): Promise<NotificationEntity | null> {
    const [row] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return row ? this.toEntity(row) : null;
  }

  async markAllRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      );
  }

  async markUnread(id: string): Promise<NotificationEntity | null> {
    const [row] = await db
      .update(notifications)
      .set({ isRead: false, readAt: null })
      .where(eq(notifications.id, id))
      .returning();
    return row ? this.toEntity(row) : null;
  }

  async bulkCreate(
    notificationsData: NotificationEntity[],
  ): Promise<NotificationEntity[]> {
    if (!notificationsData.length) return [];
    const rows = await db
      .insert(notifications)
      .values(
        notificationsData.map((notification) =>
          this.toPersistence(notification),
        ),
      )
      .returning();
    return rows.map((row) => this.toEntity(row));
  }

  async bulkDelete(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const deleted = await db
      .delete(notifications)
      .where(inArray(notifications.id, ids))
      .returning({ id: notifications.id });
    return deleted.length;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [{ total }] = await db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      );
    return Number(total);
  }

  async exists(id: string): Promise<boolean> {
    const [row] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return Boolean(row);
  }

  async count(filters?: NotificationFilters): Promise<number> {
    const conditions = [];
    if (filters?.userId)
      conditions.push(eq(notifications.userId, filters.userId));
    if (filters?.isRead !== undefined)
      conditions.push(eq(notifications.isRead, filters.isRead));
    const [{ total }] = await db
      .select({ total: count() })
      .from(notifications)
      .where(conditions.length ? and(...conditions) : undefined);
    return Number(total);
  }

  private toPersistence(notification: NotificationEntity) {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      readAt: notification.readAt ?? null,
      createdAt: notification.createdAt,
    };
  }

  private toEntity(row: typeof notifications.$inferSelect): NotificationEntity {
    return NotificationEntity.reconstitute({
      id: row.id,
      userId: row.userId,
      type: row.type as NotificationType,
      title: row.title,
      message: row.message,
      data: row.data ?? undefined,
      isRead: row.isRead,
      readAt: row.readAt ?? undefined,
      createdAt: new Date(row.createdAt),
    });
  }
}
