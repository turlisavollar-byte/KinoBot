import { User } from "../entities/user.entity";
import { UserProfile } from "../entities/user-profile.entity";
import { UserStats } from "../entities/user-stats.entity";

export interface IUserProvisioningRepository {
  createUserAggregate(
    user: User,
    profile: UserProfile,
    stats: UserStats,
  ): Promise<User>;
}
