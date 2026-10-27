"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Trash2, Calendar, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { EmptyState } from "@/components/common/EmptyState";
import { Container } from "@/components/common/layout/Container";
import { toast } from "sonner";
import { formatDate } from "@/shared/lib";
import { useWatchHistory, useAllContent } from "@/features/content";
import { routes } from "@/shared/config";
import type { HistoryItem, ContentItem } from "@streamx/api-client";

export default function HistoryPage() {
  const { items, loading: isLoading, clearAll } = useWatchHistory();
  const { lookup } = useAllContent();

  const handleClearAll = async () => {
    const ok = await clearAll();
    if (ok) toast.success("History cleared");
    else toast.error("Failed to clear history");
  };

  const resolveContent = (row: HistoryItem): ContentItem | undefined =>
    lookup.get(row.contentId);

  return (
    <ProtectedRoute>
      <main className="pb-16">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Clock className="w-8 h-8 text-primary" />
                Watch History
              </h1>
              <p className="text-muted-foreground mt-1">{items.length} items watched</p>
            </div>

            {items.length > 0 && (
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={handleClearAll}>
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No watch history yet"
              description="Start watching movies and series to see them appear here. Your progress will be tracked automatically."
              actionLabel="Browse content"
              actionHref={routes.browse}
            />
          ) : (
            <div className="space-y-4">
              {items.map((row) => {
                const content = resolveContent(row);
                if (!content) return null;
                return (
                  <div key={row.id} className="flex gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group">
                    <Link href={row.contentType === "movie" ? routes.movie(row.contentId) : routes.seriesDetail(row.contentId)} className="flex-shrink-0">
                      <div className="relative w-32 sm:w-40 aspect-video rounded-lg overflow-hidden">
                        <Image src={content.image} alt={content.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                        {row.progress < 100 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                            <div className="h-full bg-primary" style={{ width: `${row.progress}%` }} />
                          </div>
                        )}
                        {row.progress === 100 && (
                          <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">Completed</Badge>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{row.contentType}</Badge>
                        {row.episode && <span className="text-xs text-muted-foreground">{row.episode}</span>}
                      </div>
                      <h3 className="text-base font-medium text-foreground truncate">{content.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(row.watchedAt)}
                      </div>
                      {row.progress < 100 && (
                        <p className="text-xs text-primary mt-2">{100 - row.progress}% remaining</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" className="gap-1" asChild>
                        <Link href={routes.watch(row.contentId)}>
                          <Play className="w-3 h-3 fill-current" />
                          Resume
                        </Link>
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
