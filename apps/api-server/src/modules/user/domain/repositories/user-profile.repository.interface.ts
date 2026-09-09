// modules/user/domain/repositories/user-profile.repository.interface.ts

import { UserProfile } from '../entities/user-profile.entity';

export interface IUserProfileRepository {
  findById(id: string): Promise<UserProfile | null>;
  findByUserId(userId: string): Promise<UserProfile | null>;
  create(profile: UserProfile): Promise<UserProfile>;
  update(profile: UserProfile): Promise<UserProfile>;
  delete(id: string): Promise<UserProfile | null>;
  exists(id: string): Promise<boolean>;
  existsByUserId(userId: string): Promise<boolean>;
}
