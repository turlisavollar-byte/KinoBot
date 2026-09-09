export interface EpisodeProps {
  id: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  description?: string;
  duration?: number;
  telegramFileId?: string;
  storageKey?: string;
  sourceType: string;
  thumbnailUrl?: string;
  isPublished: boolean;
  viewsCount: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class Episode {
  private props: EpisodeProps;

  constructor(props: EpisodeProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get seasonId(): string {
    return this.props.seasonId;
  }

  get episodeNumber(): number {
    return this.props.episodeNumber;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get duration(): number | undefined {
    return this.props.duration;
  }

  get telegramFileId(): string | undefined {
    return this.props.telegramFileId;
  }

  get storageKey(): string | undefined {
    return this.props.storageKey;
  }

  get sourceType(): string {
    return this.props.sourceType;
  }

  get thumbnailUrl(): string | undefined {
    return this.props.thumbnailUrl;
  }

  get isPublished(): boolean {
    return this.props.isPublished;
  }

  get viewsCount(): number {
    return this.props.viewsCount;
  }

  get version(): number {
    return this.props.version;
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

  toJSON(): EpisodeProps {
    return { ...this.props };
  }
}
