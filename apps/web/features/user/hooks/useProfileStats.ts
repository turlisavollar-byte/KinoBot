"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import { fetchUserStats } from "../api";
import type { UserStats } from "../types";

const DEFAULT_STATS: UserStats = {
  moviesWatched: 0,
  seriesWatched: 0,
  hoursWatched: 0,
  watchlist: 0,
};

export function useProfileStats() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: stats = DEFAULT_STATS, isLoading } = useQuery<UserStats>({
    queryKey: ["profile", "stats"],
    queryFn: fetchUserStats,
    enabled: !!user,
  });

  return {
    stats,
    loading: authLoading || isLoading,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["profile", "stats"] }),
  };
}
