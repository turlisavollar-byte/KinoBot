export interface SendNotificationCommand {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
