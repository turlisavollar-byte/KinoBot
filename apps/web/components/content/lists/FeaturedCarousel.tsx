"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/shared/lib";
import { Play, Info, Plus, Check, Star, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/features/content";
import type { FeaturedItem } from "@streamx/api-client";

interface FeaturedCarouselProps {
  items: FeaturedItem[];
}

export function FeaturedCarousel({ items }: FeaturedCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  const currentItem = items[activeIndex];
  const { isInWatchlist, toggle } = useWatchlist();
  const inWatchlist = isInWatchlist(currentItem.id);

  return (
    <section className="relative h-[85vh] min-h-[600px] max-h-[900px] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={currentItem.backdrop}
          alt={currentItem.title}
          fill
          className="object-cover transition-opacity duration-1000"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      </div>

      <div className="relative h-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-20 lg:pb-32">
        <div className="max-w-2xl animate-in slide-up duration-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full bg-primary text-xs font-bold text-primary-foreground uppercase tracking-wider">
              {currentItem.type === "movie" ? "Movie" : "Series"}
            </span>
            <div className="flex items-center gap-1.5 text-yellow-400">
              <Star className="w-4 h-4 fill-yellow-400" />
              <span className="text-sm font-semibold">{currentItem.rating}</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-tight">
            {currentItem.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <span>{currentItem.year}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span>{currentItem.duration}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <div className="flex items-center gap-2">
              {currentItem.genres.slice(0, 3).map((genre, index) => (
                <span key={genre}>
                  {genre}
                  {index < Math.min(currentItem.genres.length, 3) - 1 && ", "}
                </span>
              ))}
            </div>
          </div>

          <p className="text-base lg:text-lg text-muted-foreground mb-6 line-clamp-3">
            {currentItem.description}
          </p>

          <div className="flex items-center gap-3">
            <Button
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow px-8 h-12 text-base font-semibold"
              asChild
            >
              <Link href={`/watch/${currentItem.id}`}>
                <Play className="w-5 h-5 fill-current" />
                Watch Now
              </Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 px-6 h-12 text-base"
              asChild
            >
              <Link href={currentItem.type === "movie" ? `/movies/${currentItem.id}` : `/series/${currentItem.id}`}>
                <Info className="w-5 h-5" />
                More Info
              </Link>
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 ml-2"
              onClick={() => toggle(currentItem.id, currentItem.type)}
            >
              {inWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <div className="absolute right-4 sm:right-8 lg:right-16 bottom-20 lg:bottom-32 flex flex-col items-end gap-4">
          <Button
            size="icon"
            variant="secondary"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/5"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === activeIndex
                  ? "w-8 bg-primary"
                  : "w-1.5 bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>

        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/5 flex items-center justify-center text-foreground opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/5 flex items-center justify-center text-foreground opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}
