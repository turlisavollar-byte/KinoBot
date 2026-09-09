// modules/analytics/domain/entities/subscription-trend.entity.ts

export interface SubscriptionDataPoint {
  date: string;
  newSubscriptions: number;
  cancellations: number;
  active: number;
  trial: number;
  expired: number;
}

export interface SubscriptionTrendProps {
  data: SubscriptionDataPoint[];
  totalNew: number;
  totalCancelled: number;
  netGrowth: number;
  startDate: Date;
  endDate: Date;
}

export class SubscriptionTrend {
  private constructor(private readonly props: SubscriptionTrendProps) {}

  static create(props: SubscriptionTrendProps): SubscriptionTrend {
    return new SubscriptionTrend(props);
  }

  get data(): SubscriptionDataPoint[] { return this.props.data; }
  get totalNew(): number { return this.props.totalNew; }
  get totalCancelled(): number { return this.props.totalCancelled; }
  get netGrowth(): number { return this.props.netGrowth; }

  toJSON(): SubscriptionTrendProps {
    return { ...this.props };
  }

  // Calculate churn rate
  getChurnRate(): number {
    if (this.props.totalNew === 0) return 0;
    return (this.props.totalCancelled / this.props.totalNew) * 100;
  }
}
