import type { NotificationEntity, NotificationType } from '../entities/notification.entity';

export interface NotificationFilters {
  userId?: string;
  type?: NotificationType[];
  isRead?: boolean;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'createdAt' | 'readAt' | 'type' | 'priority';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface NotificationPaginationResult {
  data: NotificationEntity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface INotificationRepository {
  // CRUD
  findById(id: string): Promise<NotificationEntity | null>;
  findByIdAndUser(id: string, userId: string): Promise<NotificationEntity | null>;
  
  findByUser(userId: string, page: number, limit: number): Promise<NotificationPaginationResult>;
  findMany(filters: NotificationFilters): Promise<NotificationPaginationResult>;
  findAll(filters?: Partial<NotificationFilters>): Promise<NotificationEntity[]>;
  
  create(notification: NotificationEntity): Promise<NotificationEntity>;
  update(notification: NotificationEntity): Promise<NotificationEntity>;
  delete(id: string): Promise<void>;
  
  // Read status
  markRead(id: string): Promise<NotificationEntity | null>;
  markAllRead(userId: string): Promise<void>;
  markUnread(id: string): Promise<NotificationEntity | null>;
  
  // Bulk operations
  bulkCreate(notifications: NotificationEntity[]): Promise<NotificationEntity[]>;
  bulkDelete(ids: string[]): Promise<number>;
  
  // Statistics
  getUnreadCount(userId: string): Promise<number>;
  
  // Exists
  exists(id: string): Promise<boolean>;
  
  // Count
  count(filters?: NotificationFilters): Promise<number>;
}
