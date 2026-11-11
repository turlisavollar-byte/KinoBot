"use client";

import { HorizontalScroll } from "@/components/content/lists/HorizontalScroll";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Plus, Check, Star, Calendar, Globe, Share2, Heart, Film, DollarSign, TrendingUp } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMovieDetails, useWatchlist } from "@/features/content";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { Container } from "@/components/common/layout/Container";
import { routes } from "@/shared/config";

export default function MovieDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: movie, loading } = useMovieDetails(id);
  const [isLiked, setIsLiked] = useState(false);
  const { isInWatchlist, toggle } = useWatchlist();

  if (loading || !movie) {
    if (!loading && !movie) {
      return (
        <div className="flex flex-col items-center justify-center pt-32 px-4">
          <h1 className="text-2xl font-bold text-foreground mb-4">Movie not found</h1>
          <Button asChild><Link href={routes.movies}>Browse all movies</Link></Button>
        </div>
      );
    }
    return <PageSkeleton />;
  }

  const inWatchlist = isInWatchlist(movie.id);
  const similar = movie.similar ?? [];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  return (
    <>
      <section className="relative min-h-[70vh] flex items-end">
        <div className="absolute inset-0">
          <Image src={movie.backdrop} alt={movie.title} fill className="object-cover" priority quality={90} sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <Container className="pb-8 lg:pb-12">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl">
                <Image src={movie.poster} alt={movie.title} fill className="object-cover" sizes="256px" />
              </div>
            </div>

            <div className="flex-1 max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-primary text-primary-foreground">Movie</Badge>
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  <span className="font-semibold">{movie.rating}</span>
                </div>
              </div>

              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4">{movie.title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{movie.year}</span>
                <span>{movie.duration}</span>
                <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{movie.language}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {movie.genres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="px-3 py-1">{genre}</Badge>
                ))}
              </div>

              <p className="text-base lg:text-lg text-muted-foreground mb-8 max-w-2xl">{movie.description}</p>

              <div className="flex flex-wrap items-center gap-3 mb-8">
                <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-14 text-base font-semibold shadow-lg shadow-primary/20" asChild>
                  <Link href={routes.watch(movie.id)}>
                    <Play className="w-5 h-5 fill-current" />Watch Now
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" className="gap-2 h-14 px-6" onClick={() => toggle(movie.id, "movie")}>
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="rounded-xl bg-secondary/30 p-4">
                  <Film className="w-4 h-4 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Director</p>
                  <p className="text-sm font-medium text-foreground truncate">{movie.director}</p>
                </div>
                <div className="rounded-xl bg-secondary/30 p-4">
                  <Calendar className="w-4 h-4 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Release</p>
                  <p className="text-sm font-medium text-foreground truncate">{movie.releaseDate}</p>
                </div>
                {movie.budget && (
                  <div className="rounded-xl bg-secondary/30 p-4">
                    <DollarSign className="w-4 h-4 text-primary mb-2" />
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="text-sm font-medium text-foreground truncate">{movie.budget}</p>
                  </div>
                )}
                <div className="rounded-xl bg-secondary/30 p-4">
                  <TrendingUp className="w-4 h-4 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="text-sm font-medium text-foreground">{movie.rating}/10</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {movie.cast.length > 0 && (
        <section className="py-8 lg:py-12">
          <Container>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-6">Cast</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {movie.cast.map((member) => (
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
        <HorizontalScroll title="More Like This" subtitle="You might also enjoy" items={similar} className="py-8 lg:py-12" />
      )}
    </>
  );
}
