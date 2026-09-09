// modules/user/domain/repositories/user-stats.repository.interface.ts

import { UserStats } from '../entities/user-stats.entity';

export interface IUserStatsRepository {
  findById(id: string): Promise<UserStats | null>;
  findByUserId(userId: string): Promise<UserStats | null>;
  create(stats: UserStats): Promise<UserStats>;
  update(stats: UserStats): Promise<UserStats>;
  delete(id: string): Promise<UserStats | null>;
  exists(id: string): Promise<boolean>;
  existsByUserId(userId: string): Promise<boolean>;
  incrementWatchTime(userId: string, duration: number, contentType: 'movie' | 'series' | 'episode'): Promise<UserStats>;
  addRating(userId: string, rating: number): Promise<UserStats>;
  addFavorite(userId: string): Promise<UserStats>;
  removeFavorite(userId: string): Promise<UserStats>;
  addSubscription(userId: string): Promise<UserStats>;
  removeSubscription(userId: string): Promise<UserStats>;
  addReferral(userId: string): Promise<UserStats>;
}
