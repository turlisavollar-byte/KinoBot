// modules/analytics/domain/entities/acquisition-stats.entity.ts

export interface AcquisitionSource {
  source: string;
  count: number;
  percentage: number;
}

export interface AcquisitionStatsProps {
  bySource: AcquisitionSource[];
  totalUsers: number;
  topSource: string;
  organicPercentage: number;
  period: {
    start: Date;
    end: Date;
  };
  timestamp: Date;
}

export class AcquisitionStats {
  private constructor(private readonly props: AcquisitionStatsProps) {}

  static create(props: AcquisitionStatsProps): AcquisitionStats {
    return new AcquisitionStats(props);
  }

  get bySource(): AcquisitionSource[] { return this.props.bySource; }
  get totalUsers(): number { return this.props.totalUsers; }
  get topSource(): string { return this.props.topSource; }
  get organicPercentage(): number { return this.props.organicPercentage; }

  toJSON(): AcquisitionStatsProps {
    return { ...this.props };
  }

  // Get sources sorted by count
  getTopSources(limit: number = 5): AcquisitionSource[] {
    return [...this.props.bySource]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
