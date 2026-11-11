"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Play, Trash2, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { EmptyState } from "@/components/common/EmptyState";
import { Container } from "@/components/common/layout/Container";
import { toast } from "sonner";
import { useWatchlist, useAllContent } from "@/features/content";
import { routes } from "@/shared/config";
import type { WatchlistItem, ContentItem } from "@streamx/api-client";

export default function WatchlistPage() {
  const [filter, setFilter] = useState<"all" | "movie" | "series">("all");
  const { items, loading: isLoading, toggle } = useWatchlist();
  const { lookup } = useAllContent();

  const resolveContent = (row: WatchlistItem): ContentItem | undefined =>
    lookup.get(row.contentId);

  const filteredItems = items.filter((item) =>
    filter === "all" ? true : item.contentType === filter
  );

  return (
    <ProtectedRoute>
      <main className="pb-16">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Bookmark className="w-8 h-8 text-primary" />
                My Watchlist
              </h1>
              <p className="text-muted-foreground mt-1">{items.length} items saved</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "movie" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("movie")}
              >
                Movies
              </Button>
              <Button
                variant={filter === "series" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("series")}
              >
                Series
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            items.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="Your watchlist is empty"
                description="Save movies and series to watch them later. Browse our catalog to find your next favorite."
                actionLabel="Browse content"
                actionHref={routes.browse}
              />
            ) : (
              <EmptyState
                icon={Bookmark}
                title="No items match this filter"
                description="Try switching to a different filter to see your saved items."
              />
            )
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {filteredItems.map((row) => {
                const content = resolveContent(row);
                if (!content) return null;
                return (
                  <div key={row.id} className="group relative">
                    <Link href={row.contentType === "movie" ? routes.movie(row.contentId) : routes.seriesDetail(row.contentId)}>
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-secondary/30">
                        <Image
                          src={content.image}
                          alt={content.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <Badge className="absolute top-2 left-2" variant="secondary">
                          {row.contentType}
                        </Badge>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h3 className="text-sm font-medium text-white line-clamp-1">{content.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
                            <span>{content.year}</span>
                            <span>{content.duration}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" className="w-9 h-9 rounded-full bg-primary text-primary-foreground" asChild>
                        <Link href={routes.watch(row.contentId)}>
                          <Play className="w-4 h-4 fill-current" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="w-9 h-9 rounded-full bg-black/60 text-white hover:text-red-500"
                        onClick={() => toggle(row.contentId, row.contentType)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Container>
      </main>
    </ProtectedRoute>
  );
}
