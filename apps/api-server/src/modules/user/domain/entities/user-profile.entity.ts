// modules/user/domain/entities/user-profile.entity.ts

import { Email } from '../value-objects/email.vo';
import { Phone } from '../value-objects/phone.vo';

export interface UserProfileProps {
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  location?: string;
  website?: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  preferences?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class UserProfile {
  private constructor(private readonly props: UserProfileProps) {}

  static create(props: Omit<UserProfileProps, 'createdAt' | 'updatedAt'>): UserProfile {
    return new UserProfile({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: UserProfileProps): UserProfile {
    return new UserProfile(props);
  }

  get userId(): string { return this.props.userId; }
  get displayName(): string { return this.props.displayName; }
  get bio(): string | undefined { return this.props.bio; }
  get avatar(): string | undefined { return this.props.avatar; }
  get coverImage(): string | undefined { return this.props.coverImage; }
  get location(): string | undefined { return this.props.location; }
  get website(): string | undefined { return this.props.website; }
  get birthDate(): Date | undefined { return this.props.birthDate; }
  get gender(): string | undefined { return this.props.gender; }
  get preferences(): Record<string, unknown> { return this.props.preferences || {}; }
  get metadata(): Record<string, unknown> { return this.props.metadata || {}; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  update(data: Partial<Omit<UserProfileProps, 'userId' | 'createdAt' | 'updatedAt'>>): void {
    if (data.displayName !== undefined) this.props.displayName = data.displayName;
    if (data.bio !== undefined) this.props.bio = data.bio;
    if (data.avatar !== undefined) this.props.avatar = data.avatar;
    if (data.coverImage !== undefined) this.props.coverImage = data.coverImage;
    if (data.location !== undefined) this.props.location = data.location;
    if (data.website !== undefined) this.props.website = data.website;
    if (data.birthDate !== undefined) this.props.birthDate = data.birthDate;
    if (data.gender !== undefined) this.props.gender = data.gender;
    if (data.preferences !== undefined) this.props.preferences = data.preferences;
    if (data.metadata !== undefined) this.props.metadata = data.metadata;
    this.props.updatedAt = new Date();
  }

  getAge(): number | undefined {
    if (!this.birthDate) return undefined;
    const today = new Date();
    let age = today.getFullYear() - this.birthDate.getFullYear();
    const monthDiff = today.getMonth() - this.birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.birthDate.getDate())) {
      age--;
    }
    return age;
  }

  toJSON(): UserProfileProps {
    return { ...this.props };
  }

  toPublicData() {
    return {
      displayName: this.displayName,
      bio: this.bio,
      avatar: this.avatar,
      coverImage: this.coverImage,
      location: this.location,
      website: this.website,
      age: this.getAge(),
      gender: this.gender,
      preferences: this.preferences,
    };
  }
}