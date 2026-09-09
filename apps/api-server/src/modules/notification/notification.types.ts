export type NotificationChannel = "telegram" | "push" | "email" | "sms";
export type NotificationStatus = "pending" | "sent" | "failed" | "cancelled";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface SendNotificationDTO {
  userId?: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
  scheduledAt?: Date;
}

export interface BroadcastDTO {
  channel: NotificationChannel;
  title: string;
  body: string;
  targetUserIds?: string[];
  priority?: NotificationPriority;
}
