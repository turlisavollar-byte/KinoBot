"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, ArrowLeft, Star, Calendar, Globe, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSeason } from "@/features/content";
import { Container } from "@/components/common/layout/Container";
import { routes } from "@/shared/config";

export default function SeasonPage() {
  const params = useParams<{ id: string; seasonNumber: string }>();
  const id = params.id as string;
  const seasonNumber = parseInt(params.seasonNumber as string, 10) || 1;

  const { data, loading } = useSeason(id, seasonNumber);

  if (loading) {
    return (
      <div className="flex justify-center pt-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 px-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">Series not found</h1>
        <Button asChild><Link href={routes.series}>Browse all series</Link></Button>
      </div>
    );
  }

  const { series, episodes } = data;

  return (
    <>
      <section className="relative pt-24 pb-8">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={series.backdrop}
            alt={series.title}
            fill
            className="object-cover opacity-20"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/70" />
        </div>

        <Container width="wide">
          <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground hover:text-foreground" asChild>
            <Link href={routes.seriesDetail(series.id)}>
              <ArrowLeft className="w-4 h-4" />
              Back to {series.title}
            </Link>
          </Button>

          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-primary text-primary-foreground">Season {seasonNumber}</Badge>
            <Badge variant="secondary">{episodes.length} Episodes</Badge>
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-4 h-4 fill-yellow-400" />
              <span className="font-semibold">{series.rating}</span>
            </div>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">{series.title}</h1>
          <p className="text-muted-foreground mb-4">Season {seasonNumber}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{series.year}</span>
            <span>{series.seasons} Season{series.seasons > 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{series.language}</span>
          </div>
        </Container>
      </section>

      <section className="pb-16">
        <Container width="wide">
          <div className="space-y-3">
            {episodes.map((episode) => (
              <Link
                key={episode.id}
                href={routes.watchWithEpisode(series.id, seasonNumber, episode.number)}
                className="flex gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all group"
              >
                <div className="relative w-40 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={episode.image}
                    alt={episode.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="160px"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-primary">S{seasonNumber} E{episode.number}</span>
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
    </>
  );
}
