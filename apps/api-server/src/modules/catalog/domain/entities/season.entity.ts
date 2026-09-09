export interface SeasonProps {
  id: string;
  seriesId: string;
  seasonNumber: number;
  title?: string;
  episodesCount: number;
  posterUrl?: string;
  releaseDate?: Date;
  createdAt: Date;
  deletedAt?: Date;
}

export class Season {
  private props: SeasonProps;

  constructor(props: SeasonProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get seriesId(): string {
    return this.props.seriesId;
  }

  get seasonNumber(): number {
    return this.props.seasonNumber;
  }

  get title(): string | undefined {
    return this.props.title;
  }

  get episodesCount(): number {
    return this.props.episodesCount;
  }

  get posterUrl(): string | undefined {
    return this.props.posterUrl;
  }

  get releaseDate(): Date | undefined {
    return this.props.releaseDate;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  toJSON(): SeasonProps {
    return { ...this.props };
  }
}
