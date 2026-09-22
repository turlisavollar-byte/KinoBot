"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import { history as historyApi, type HistoryItem, type ContentType } from "@streamx/api-client";

export function useWatchHistory(contentId?: string | null) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["history"],
    queryFn: () => historyApi.list(),
    enabled: !!user,
  });

  const currentProgress = contentId
    ? items.find((r) => r.contentId === contentId)?.progress ?? 0
    : 0;

  const upsertMutation = useMutation({
    mutationFn: ({
      id,
      contentType,
      progress,
      episode,
    }: {
      id: string;
      contentType: ContentType;
      progress: number;
      episode?: string | null;
    }) => historyApi.upsert(id, contentType, progress, episode ?? null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (rowId: string) => historyApi.remove(rowId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  });

  const clearMutation = useMutation({
    mutationFn: () => historyApi.clear(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  });

  const saveProgress = (id: string, contentType: ContentType, progress: number, episode?: string) => {
    if (!user) return;
    upsertMutation.mutate({ id, contentType, progress, episode: episode ?? null });
  };

  const remove = (rowId: string) => removeMutation.mutateAsync(rowId).then(() => true).catch(() => false);

  const clearAll = () => clearMutation.mutateAsync().then(() => true).catch(() => false);

  return {
    items,
    currentProgress,
    loading: authLoading || isLoading,
    saveProgress,
    remove,
    clearAll,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  };
}
