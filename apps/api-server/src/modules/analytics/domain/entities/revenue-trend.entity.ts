// modules/analytics/domain/entities/revenue-trend.entity.ts

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  transactions: number;
  averageTransactionValue: number;
  refunds: number;
  netRevenue: number;
  currency: string;
}

export interface RevenueTrendProps {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  data: RevenueDataPoint[];
  totalRevenue: number;
  totalTransactions: number;
  averageRevenue: number;
  growthRate: number;
  startDate: Date;
  endDate: Date;
}

export class RevenueTrend {
  private constructor(private readonly props: RevenueTrendProps) {}

  static create(props: RevenueTrendProps): RevenueTrend {
    return new RevenueTrend(props);
  }

  get data(): RevenueDataPoint[] { return this.props.data; }
  get totalRevenue(): number { return this.props.totalRevenue; }
  get growthRate(): number { return this.props.growthRate; }

  toJSON(): RevenueTrendProps {
    return { ...this.props };
  }

  // Calculate moving average
  getMovingAverage(windowSize: number = 7): RevenueDataPoint[] {
    const result: RevenueDataPoint[] = [];
    for (let i = 0; i < this.data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = this.data.slice(start, i + 1);
      const avg = window.reduce((sum, d) => sum + d.revenue, 0) / window.length;
      result.push({
        ...this.data[i],
        revenue: avg,
      });
    }
    return result;
  }
}