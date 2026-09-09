// modules/analytics/domain/entities/top-content.entity.ts

export interface ContentItem {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'episode';
  viewCount: number;
  uniqueViewers: number;
  totalWatchTime: number;
  averageWatchTime: number;
  completionRate: number;
  rating: number;
  ratingCount: number;
  posterUrl?: string;
  genres?: string[];
  viewsGrowth: number;
  engagementScore: number;
}

export interface TopContentProps {
  items: ContentItem[];
  totalViews: number;
  averageViews: number;
  period: {
    start: Date;
    end: Date;
  };
  limit: number;
  offset: number;
  hasMore: boolean;
}

export class TopContent {
  private constructor(private readonly props: TopContentProps) {}

  static create(props: TopContentProps): TopContent {
    return new TopContent(props);
  }

  get items(): ContentItem[] { return this.props.items; }
  get hasMore(): boolean { return this.props.hasMore; }

  toJSON(): TopContentProps {
    return { ...this.props };
  }

  // Get top by category
  filterByType(type: 'movie' | 'series' | 'episode'): ContentItem[] {
    return this.items.filter(item => item.type === type);
  }

  // Get sorted by engagement
  getMostEngaging(limit: number = 10): ContentItem[] {
    return [...this.items]
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, limit);
  }
}