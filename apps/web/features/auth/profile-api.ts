import { profile as profileApi } from "@streamx/api-client";
import type { Profile } from "@streamx/api-client";

export async function fetchProfile(): Promise<Profile | null> {
  try {
    return await profileApi.get();
  } catch {
    return null;
  }
}

export async function updateProfile(
  updates: { fullName?: string; avatarUrl?: string }
): Promise<Profile | null> {
  try {
    return await profileApi.update(updates);
  } catch {
    return null;
  }
}
