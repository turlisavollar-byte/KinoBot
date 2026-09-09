import type { Genre } from '@workspace/db';

export interface SeriesProps {
  id: string;
  title: string;
  originalTitle?: string;
  description?: string;
  releaseYear?: number;
  ageRating?: string;
  posterUrl?: string;
  backgroundUrl?: string;
  trailerUrl?: string;
  seasonsCount: number;
  isPublished: boolean;
  viewsCount: number;
  ratingAvg: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  genres?: Genre[];
}

export class Series {
  private props: SeriesProps;

  constructor(props: SeriesProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get title(): string {
    return this.props.title;
  }

  get originalTitle(): string | undefined {
    return this.props.originalTitle;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get releaseYear(): number | undefined {
    return this.props.releaseYear;
  }

  get ageRating(): string | undefined {
    return this.props.ageRating;
  }

  get posterUrl(): string | undefined {
    return this.props.posterUrl;
  }

  get backgroundUrl(): string | undefined {
    return this.props.backgroundUrl;
  }

  get trailerUrl(): string | undefined {
    return this.props.trailerUrl;
  }

  get seasonsCount(): number {
    return this.props.seasonsCount;
  }

  get isPublished(): boolean {
    return this.props.isPublished;
  }

  get viewsCount(): number {
    return this.props.viewsCount;
  }

  get ratingAvg(): number {
    return this.props.ratingAvg;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  get genres(): Genre[] {
    return this.props.genres || [];
  }

  toJSON(): SeriesProps {
    return { ...this.props };
  }
}
