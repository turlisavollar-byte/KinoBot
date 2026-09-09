// modules/analytics/domain/entities/video-code-stats.entity.ts

export interface VideoCodeStatsProps {
  total: number;
  active: number;
  pending: number;
  views: number;
  byChannel: Array<{ channelId: string; count: number }>;
  timestamp: Date;
}

export class VideoCodeStats {
  private constructor(private readonly props: VideoCodeStatsProps) {}

  static create(props: VideoCodeStatsProps): VideoCodeStats {
    return new VideoCodeStats(props);
  }

  get total(): number { return this.props.total; }
  get active(): number { return this.props.active; }
  get pending(): number { return this.props.pending; }
  get views(): number { return this.props.views; }
  get byChannel(): Array<{ channelId: string; count: number }> { return this.props.byChannel; }

  toJSON(): VideoCodeStatsProps {
    return { ...this.props };
  }

  getActivationRate(): number {
    if (this.props.total === 0) return 0;
    return (this.props.active / this.props.total) * 100;
  }
}
