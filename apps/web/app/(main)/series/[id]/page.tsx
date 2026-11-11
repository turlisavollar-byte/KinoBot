"use client";

import { HorizontalScroll } from "@/components/content/lists/HorizontalScroll";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Plus, Check, Star, Calendar, Globe, Share2, Heart } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSeriesDetails, useWatchlist } from "@/features/content";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { Container } from "@/components/common/layout/Container";
import { routes } from "@/shared/config";

export default function SeriesDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: series, loading } = useSeriesDetails(id);
  const [isLiked, setIsLiked] = useState(false);
  const { isInWatchlist, toggle } = useWatchlist();

  if (loading || !series) {
    if (!loading && !series) {
      return (
        <div className="flex flex-col items-center justify-center pt-32 px-4">
          <h1 className="text-2xl font-bold text-foreground mb-4">Series not found</h1>
          <Button asChild><Link href={routes.series}>Browse all series</Link></Button>
        </div>
      );
    }
    return <PageSkeleton />;
  }

  const inWatchlist = isInWatchlist(series.id);
  const episodes = series.episodesList ?? [];
  const similar = series.similar ?? [];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  return (
    <>
      <section className="relative min-h-[70vh] flex items-end">
        <div className="absolute inset-0">
          <Image src={series.backdrop} alt={series.title} fill className="object-cover" priority quality={90} sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <Container className="pb-8 lg:pb-12">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl">
                <Image src={series.poster} alt={series.title} fill className="object-cover" sizes="256px" />
              </div>
            </div>

            <div className="flex-1 max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-primary text-primary-foreground">Series</Badge>
                <Badge variant="secondary" className="text-emerald-400 border-emerald-400/20">{series.status}</Badge>
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  <span className="font-semibold">{series.rating}</span>
                </div>
              </div>

              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4">{series.title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{series.year}</span>
                <span>{series.seasons} Season{series.seasons > 1 ? "s" : ""}</span>
                <span>{series.episodes} Episodes</span>
                <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{series.language}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {series.genres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="px-3 py-1">{genre}</Badge>
                ))}
              </div>

              <p className="text-base lg:text-lg text-muted-foreground mb-8 max-w-2xl">{series.description}</p>

              <div className="flex flex-wrap items-center gap-3 mb-8">
                <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-14 text-base font-semibold shadow-lg shadow-primary/20" asChild>
                  <Link href={routes.watch(series.id)}>
                    <Play className="w-5 h-5 fill-current" />Watch S1 E1
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" className="gap-2 h-14 px-6" onClick={() => toggle(series.id, "series")}>
                  {inWatchlist ? (
                    <><Check className="w-5 h-5 text-primary" />In Watchlist</>
                  ) : (
                    <><Plus className="w-5 h-5" />Add to Watchlist</>
                  )}
                </Button>
                <Button size="icon" variant="secondary" className={`w-14 h-14 rounded-full ${isLiked ? "text-red-500" : ""}`} onClick={() => setIsLiked(!isLiked)}>
                  <Heart className={`w-5 h-5 ${isLiked ? "fill-red-500" : ""}`} />
                </Button>
                <Button size="icon" variant="secondary" className="w-14 h-14 rounded-full" onClick={handleShare}>
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">Creator: </span>
                  <span className="text-sm font-medium text-foreground">{series.creator}</span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {episodes.length > 0 && (
        <section className="py-8 lg:py-12">
          <Container>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-6">Season 1</h2>
            <div className="space-y-3">
              {episodes.map((episode) => (
                <Link key={episode.id} href={routes.watchWithEpisode(series.id, 1, episode.number)} className="flex gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all group">
                  <div className="relative w-40 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={episode.image} alt={episode.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="160px" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-primary">E{episode.number}</span>
                      <span className="text-sm text-muted-foreground">{episode.duration}</span>
                    </div>
                    <h3 className="text-base font-medium text-foreground mb-1">{episode.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{episode.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {series.cast.length > 0 && (
        <section className="py-8 lg:py-12">
          <Container>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-6">Cast</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {series.cast.map((member) => (
                <div key={member.name} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="w-12 h-12 rounded-full overflow-hidden relative flex-shrink-0">
                    <Image src={member.image} alt={member.name} fill className="object-cover" sizes="48px" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {similar.length > 0 && (
        <HorizontalScroll title="Similar Series" subtitle="You might also like" items={similar} className="py-8 lg:py-12" />
      )}
    </>
  );
}
