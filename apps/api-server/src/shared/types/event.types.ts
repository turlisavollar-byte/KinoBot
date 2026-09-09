export type EventType =
  | "user.registered"
  | "user.updated"
  | "user.deleted"
  | "subscription.created"
  | "subscription.renewed"
  | "subscription.cancelled"
  | "subscription.expired"
  | "payment.completed"
  | "payment.failed"
  | "payment.refunded"
  | "content.viewed"
  | "content.completed"
  | "content.rated"
  | "device.registered"
  | "device.removed"
  | "bot.user_started"
  | "bot.message_sent";

export interface DomainEvent<T = unknown> {
  id: string;
  type: EventType;
  payload: T;
  timestamp: Date;
  userId?: string;
}
