import { Subscription } from './Subscription';
import { PaginatedResult, PaginationParams } from '@/shared/types';

export interface ISubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findByUserId(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Subscription>>;
  findActiveByUserId(userId: string): Promise<Subscription | null>;
  save(subscription: Subscription): Promise<Subscription>;
  update(subscription: Subscription): Promise<Subscription>;
  delete(id: string): Promise<void>;
}
