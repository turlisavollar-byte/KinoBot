export interface ActorProps {
  id: string;
  name: string;
  photoUrl?: string;
  biography?: string;
  birthDate?: Date;
  birthPlace?: string;
  deletedAt?: Date;
}

export class Actor {
  private props: ActorProps;

  constructor(props: ActorProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get photoUrl(): string | undefined {
    return this.props.photoUrl;
  }

  get biography(): string | undefined {
    return this.props.biography;
  }

  get birthDate(): Date | undefined {
    return this.props.birthDate;
  }

  get birthPlace(): string | undefined {
    return this.props.birthPlace;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  toJSON(): ActorProps {
    return { ...this.props };
  }
}
