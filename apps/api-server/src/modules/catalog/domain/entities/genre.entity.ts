export interface GenreProps {
  id: number;
  name: string;
  slug: string;
  deletedAt?: Date;
}

export class Genre {
  private props: GenreProps;

  constructor(props: GenreProps) {
    this.props = props;
  }

  get id(): number {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  toJSON(): GenreProps {
    return { ...this.props };
  }
}
