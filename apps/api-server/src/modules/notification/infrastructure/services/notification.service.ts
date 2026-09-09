import type { NotificationType } from '../../domain/entities/notification.entity'
import type { INotificationRepository } from '../../domain/repositories/notification.repository.interface'
import { NotificationEntity } from '../../domain/entities/notification.entity'

export interface INotificationService {
  notifyOrderCreated(userId: string, orderId: string, orderNumber: string): Promise<void>
  notifyOrderPaid(userId: string, orderId: string, orderNumber: string): Promise<void>
  notifyOrderShipped(userId: string, orderId: string, trackingNumber?: string): Promise<void>
  notifyOrderDelivered(userId: string, orderId: string): Promise<void>
}

export class NotificationService implements INotificationService {
  constructor(private notificationRepository: INotificationRepository) {}

  async notifyOrderCreated(userId: string, orderId: string, orderNumber: string): Promise<void> {
    const notification = NotificationEntity.create({
      userId,
      type: 'order' as NotificationType,
      title: 'Order Created',
      message: `Your order #${orderNumber} has been created successfully.`,
      data: { orderId, orderNumber },
    })
    await this.notificationRepository.create(notification)
  }

  async notifyOrderPaid(userId: string, orderId: string, orderNumber: string): Promise<void> {
    const notification = NotificationEntity.create({
      userId,
      type: 'payment' as NotificationType,
      title: 'Payment Successful',
      message: `Payment for order #${orderNumber} has been confirmed.`,
      data: { orderId, orderNumber },
    })
    await this.notificationRepository.create(notification)
  }

  async notifyOrderShipped(userId: string, orderId: string, trackingNumber?: string): Promise<void> {
    const message = trackingNumber
      ? `Your order has been shipped. Tracking number: ${trackingNumber}`
      : 'Your order has been shipped.'
    
    const notification = NotificationEntity.create({
      userId,
      type: 'shipping' as NotificationType,
      title: 'Order Shipped',
      message,
      data: { orderId, trackingNumber },
    })
    await this.notificationRepository.create(notification)
  }

  async notifyOrderDelivered(userId: string, orderId: string): Promise<void> {
    const notification = NotificationEntity.create({
      userId,
      type: 'shipping' as NotificationType,
      title: 'Order Delivered',
      message: 'Your order has been delivered successfully.',
      data: { orderId },
    })
    await this.notificationRepository.create(notification)
  }
}
