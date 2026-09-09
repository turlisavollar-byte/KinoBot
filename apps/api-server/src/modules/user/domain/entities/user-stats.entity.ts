// modules/user/domain/entities/user-stats.entity.ts

export interface UserStatsProps {
  userId: string;
  totalWatchTime: number; // in minutes
  totalWatchSessions: number;
  totalMoviesWatched: number;
  totalSeriesWatched: number;
  totalEpisodesWatched: number;
  totalFavorites: number;
  totalRatings: number;
  averageRating: number;
  lastWatchDate?: Date;
  activeStreak: number; // consecutive days
  longestStreak: number;
  totalSubscriptions: number;
  activeSubscriptionCount: number;
  totalReferrals: number;
  referralRewards: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserStats {
  private constructor(private readonly props: UserStatsProps) {}

  static create(props: Omit<UserStatsProps, 'createdAt' | 'updatedAt'>): UserStats {
    return new UserStats({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: UserStatsProps): UserStats {
    return new UserStats(props);
  }

  get userId(): string { return this.props.userId; }
  get totalWatchTime(): number { return this.props.totalWatchTime; }
  get totalWatchSessions(): number { return this.props.totalWatchSessions; }
  get totalMoviesWatched(): number { return this.props.totalMoviesWatched; }
  get totalSeriesWatched(): number { return this.props.totalSeriesWatched; }
  get totalEpisodesWatched(): number { return this.props.totalEpisodesWatched; }
  get totalFavorites(): number { return this.props.totalFavorites; }
  get totalRatings(): number { return this.props.totalRatings; }
  get averageRating(): number { return this.props.averageRating; }
  get lastWatchDate(): Date | undefined { return this.props.lastWatchDate; }
  get activeStreak(): number { return this.props.activeStreak; }
  get longestStreak(): number { return this.props.longestStreak; }
  get totalSubscriptions(): number { return this.props.totalSubscriptions; }
  get activeSubscriptionCount(): number { return this.props.activeSubscriptionCount; }
  get totalReferrals(): number { return this.props.totalReferrals; }
  get referralRewards(): number { return this.props.referralRewards; }

  recordWatch(duration: number, contentType: 'movie' | 'series' | 'episode'): void {
    this.props.totalWatchTime += duration;
    this.props.totalWatchSessions++;
    
    if (contentType === 'movie') this.props.totalMoviesWatched++;
    if (contentType === 'series') this.props.totalSeriesWatched++;
    if (contentType === 'episode') this.props.totalEpisodesWatched++;
    
    // Update streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (this.props.lastWatchDate) {
      const lastDate = new Date(this.props.lastWatchDate);
      lastDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        this.props.activeStreak++;
        if (this.props.activeStreak > this.props.longestStreak) {
          this.props.longestStreak = this.props.activeStreak;
        }
      } else if (diffDays > 1) {
        this.props.activeStreak = 1;
      }
    } else {
      this.props.activeStreak = 1;
    }
    
    this.props.lastWatchDate = new Date();
    this.props.updatedAt = new Date();
  }

  addRating(rating: number): void {
    const total = this.props.totalRatings * this.props.averageRating + rating;
    this.props.totalRatings++;
    this.props.averageRating = total / this.props.totalRatings;
    this.props.updatedAt = new Date();
  }

  addFavorite(): void {
    this.props.totalFavorites++;
    this.props.updatedAt = new Date();
  }

  removeFavorite(): void {
    this.props.totalFavorites = Math.max(0, this.props.totalFavorites - 1);
    this.props.updatedAt = new Date();
  }

  addSubscription(): void {
    this.props.totalSubscriptions++;
    this.props.activeSubscriptionCount++;
    this.props.updatedAt = new Date();
  }

  removeSubscription(): void {
    this.props.activeSubscriptionCount = Math.max(0, this.props.activeSubscriptionCount - 1);
    this.props.updatedAt = new Date();
  }

  addReferral(): void {
    this.props.totalReferrals++;
    this.props.referralRewards += 10; // Example: 10 points per referral
    this.props.updatedAt = new Date();
  }

  toJSON(): UserStatsProps {
    return { ...this.props };
  }

  toPublicData() {
    return {
      totalWatchTime: this.totalWatchTime,
      totalWatchSessions: this.totalWatchSessions,
      totalMoviesWatched: this.totalMoviesWatched,
      totalSeriesWatched: this.totalSeriesWatched,
      totalEpisodesWatched: this.totalEpisodesWatched,
      totalFavorites: this.totalFavorites,
      totalRatings: this.totalRatings,
      averageRating: this.averageRating,
      lastWatchDate: this.lastWatchDate?.toISOString(),
      activeStreak: this.activeStreak,
      longestStreak: this.longestStreak,
      totalSubscriptions: this.totalSubscriptions,
      activeSubscriptionCount: this.activeSubscriptionCount,
      totalReferrals: this.totalReferrals,
      referralRewards: this.referralRewards,
    };
  }
}