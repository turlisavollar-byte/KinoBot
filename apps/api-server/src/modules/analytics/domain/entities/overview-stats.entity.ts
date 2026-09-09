// modules/analytics/domain/entities/overview-stats.entity.ts

export interface OverviewStatsProps {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalMovies: number;
  totalSeries: number;
  totalEpisodes: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  dailyRevenue: number;
  watchSessionsToday: number;
  watchSessionsThisWeek: number;
  totalWatchMinutes: number;
  averageWatchTime: number;
  userRetentionRate: number;
  churnRate: number;
  videoCodesTotal: number;
  videoCodesActive: number;
  totalCodeViews: number;
  timestamp: Date;
}

export class OverviewStats {
  private constructor(private readonly props: OverviewStatsProps) {}

  static create(props: OverviewStatsProps): OverviewStats {
    return new OverviewStats(props);
  }

  get totalUsers(): number { return this.props.totalUsers; }
  get activeUsers(): number { return this.props.activeUsers; }
  get newUsersToday(): number { return this.props.newUsersToday; }
  get newUsersThisWeek(): number { return this.props.newUsersThisWeek; }
  get newUsersThisMonth(): number { return this.props.newUsersThisMonth; }
  get totalMovies(): number { return this.props.totalMovies; }
  get totalSeries(): number { return this.props.totalSeries; }
  get totalEpisodes(): number { return this.props.totalEpisodes; }
  get activeSubscriptions(): number { return this.props.activeSubscriptions; }
  get totalRevenue(): number { return this.props.totalRevenue; }
  get monthlyRevenue(): number { return this.props.monthlyRevenue; }
  get dailyRevenue(): number { return this.props.dailyRevenue; }
  get watchSessionsToday(): number { return this.props.watchSessionsToday; }
  get watchSessionsThisWeek(): number { return this.props.watchSessionsThisWeek; }
  get totalWatchMinutes(): number { return this.props.totalWatchMinutes; }
  get averageWatchTime(): number { return this.props.averageWatchTime; }
  get userRetentionRate(): number { return this.props.userRetentionRate; }
  get churnRate(): number { return this.props.churnRate; }
  get videoCodesTotal(): number { return this.props.videoCodesTotal; }
  get videoCodesActive(): number { return this.props.videoCodesActive; }
  get totalCodeViews(): number { return this.props.totalCodeViews; }
  get timestamp(): Date { return this.props.timestamp; }

  toJSON(): OverviewStatsProps {
    return { ...this.props };
  }

  calculateGrowthRate(previous: OverviewStats): number {
    if (previous.totalUsers === 0) return 0;
    return ((this.totalUsers - previous.totalUsers) / previous.totalUsers) * 100;
  }
}