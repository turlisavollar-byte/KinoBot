export type NotificationType = 'order' | 'payment' | 'shipping' | 'promotion' | 'system'

export interface NotificationProps {
  id: string;
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
  isRead: boolean
  readAt?: Date
  createdAt: Date
}

export class NotificationEntity {
  private constructor(private props: NotificationProps) {}

  static create(props: Omit<NotificationProps, 'id' | 'isRead' | 'createdAt'>): NotificationEntity {
    return new NotificationEntity({
      ...props,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      isRead: false,
      createdAt: new Date(),
    })
  }

  static reconstitute(props: NotificationProps): NotificationEntity {
    return new NotificationEntity(props)
  }

  get id(): string { return this.props.id }
  get userId(): string { return this.props.userId }
  get type(): NotificationType { return this.props.type }
  get title(): string { return this.props.title }
  get message(): string { return this.props.message }
  get isRead(): boolean { return this.props.isRead }
  get readAt(): Date | undefined { return this.props.readAt }
  get createdAt(): Date { return this.props.createdAt }
  get data(): Record<string, unknown> | undefined { return this.props.data }

  markAsRead(): void {
    this.props.isRead = true
    this.props.readAt = new Date()
  }

  toJSON(): NotificationProps {
    return { ...this.props }
  }
}
