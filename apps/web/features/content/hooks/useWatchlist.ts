"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import { toast } from "sonner";
import { watchlist as watchlistApi, type WatchlistItem, type ContentType } from "@streamx/api-client";

export function useWatchlist() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<WatchlistItem[]>({
    queryKey: ["watchlist"],
    queryFn: () => watchlistApi.list(),
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ contentId, contentType }: { contentId: string; contentType: ContentType }) =>
      watchlistApi.toggle(contentId, contentType),
    onMutate: async ({ contentId, contentType }) => {
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });
      const prev = queryClient.getQueryData<WatchlistItem[]>(["watchlist"]);
      const exists = prev?.some((item) => item.contentId === contentId);
      if (exists) {
        queryClient.setQueryData<WatchlistItem[]>(
          ["watchlist"],
          prev!.filter((item) => item.contentId !== contentId)
        );
      }
      return { prev };
    },
    onSuccess: (result, { contentId }) => {
      if (result.action === "removed") {
        queryClient.setQueryData<WatchlistItem[]>(
          ["watchlist"],
          (prev) => prev?.filter((item) => item.contentId !== contentId) ?? []
        );
        toast.success("Removed from watchlist");
      } else if (result.item) {
        queryClient.setQueryData<WatchlistItem[]>(
          ["watchlist"],
          (prev) => [...(prev ?? []), result.item!]
        );
        toast.success("Added to watchlist");
      }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["watchlist"], ctx.prev);
      toast.error("Failed to update watchlist");
    },
  });

  const isInWatchlist = (contentId: string) => items.some((item) => item.contentId === contentId);

  const toggle = (contentId: string, contentType: ContentType) => {
    if (!user) {
      toast.error("Sign in to save items to your watchlist");
      return;
    }
    toggleMutation.mutate({ contentId, contentType });
  };

  return { items, loading: authLoading || isLoading, isInWatchlist, toggle, refresh: () => queryClient.invalidateQueries({ queryKey: ["watchlist"] }) };
}
