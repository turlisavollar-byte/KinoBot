import { profile as profileApi } from "@streamx/api-client";
import type { UserStats } from "@streamx/api-client";

export async function fetchUserStats(): Promise<UserStats> {
  return profileApi.getStats();
}
