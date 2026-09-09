export interface ListNotificationsQuery {
  userId: string;
  page?: number;
  limit?: number;
  type?: string[];
  isRead?: boolean;
}
