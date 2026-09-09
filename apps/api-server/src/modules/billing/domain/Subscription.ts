export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired';
export type BillingInterval = 'monthly' | 'yearly' | 'one_time';

export interface SubscriptionProps {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEnd: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class Subscription {
  private _id: string;
  private _userId: string;
  private _planId: string;
  private _status: SubscriptionStatus;
  private _currentPeriodStart: Date;
  private _currentPeriodEnd: Date;
  private _cancelAtPeriodEnd: boolean;
  private _canceledAt: Date | null;
  private _trialEnd: Date | null;
  private _metadata: Record<string, unknown>;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: SubscriptionProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._planId = props.planId;
    this._status = props.status;
    this._currentPeriodStart = props.currentPeriodStart;
    this._currentPeriodEnd = props.currentPeriodEnd;
    this._cancelAtPeriodEnd = props.cancelAtPeriodEnd;
    this._canceledAt = props.canceledAt;
    this._trialEnd = props.trialEnd;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(params: {
    userId: string;
    planId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialEnd?: Date;
    metadata?: Record<string, unknown>;
  }): Subscription {
    if (!params.userId) throw new Error('userId is required');
    if (!params.planId) throw new Error('planId is required');
    if (params.currentPeriodStart >= params.currentPeriodEnd) {
      throw new Error('currentPeriodStart must be before currentPeriodEnd');
    }

    const now = new Date();
    const hasTrial = params.trialEnd && params.trialEnd > now;

    return new Subscription({
      id: crypto.randomUUID(),
      userId: params.userId,
      planId: params.planId,
      status: hasTrial ? 'trialing' : 'active',
      currentPeriodStart: params.currentPeriodStart,
      currentPeriodEnd: params.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialEnd: params.trialEnd || null,
      metadata: params.metadata || {},
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: SubscriptionProps): Subscription {
    return new Subscription(props);
  }

  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get planId(): string { return this._planId; }
  get status(): SubscriptionStatus { return this._status; }
  get currentPeriodStart(): Date { return this._currentPeriodStart; }
  get currentPeriodEnd(): Date { return this._currentPeriodEnd; }
  get cancelAtPeriodEnd(): boolean { return this._cancelAtPeriodEnd; }
  get canceledAt(): Date | null { return this._canceledAt; }
  get trialEnd(): Date | null { return this._trialEnd; }
  get metadata(): Record<string, unknown> { return this._metadata; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  cancel(immediate: boolean): void {
    if (this._status === 'canceled') return;

    if (immediate) {
      this._status = 'canceled';
      this._canceledAt = new Date();
    } else {
      this._cancelAtPeriodEnd = true;
    }
    this._updatedAt = new Date();
  }

  markPastDue(): void {
    this._status = 'past_due';
    this._updatedAt = new Date();
  }

  expire(): void {
    this._status = 'expired';
    this._updatedAt = new Date();
  }

  activate(): void {
    this._status = 'active';
    this._updatedAt = new Date();
  }

  renew(newPeriodStart: Date, newPeriodEnd: Date): void {
    if (newPeriodStart >= newPeriodEnd) {
      throw new Error('newPeriodStart must be before newPeriodEnd');
    }
    this._currentPeriodStart = newPeriodStart;
    this._currentPeriodEnd = newPeriodEnd;

    if (this._cancelAtPeriodEnd) {
      this._status = 'canceled';
      this._canceledAt = new Date();
    } else {
      this._status = 'active';
    }
    this._updatedAt = new Date();
  }

  isActive(): boolean {
    return this._status === 'active' || this._status === 'trialing';
  }

  toProps(): SubscriptionProps {
    return {
      id: this._id,
      userId: this._userId,
      planId: this._planId,
      status: this._status,
      currentPeriodStart: this._currentPeriodStart,
      currentPeriodEnd: this._currentPeriodEnd,
      cancelAtPeriodEnd: this._cancelAtPeriodEnd,
      canceledAt: this._canceledAt,
      trialEnd: this._trialEnd,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
