"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/lib";
import { Play, Plus, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/features/content";

interface ContentCardProps {
  id: string;
  title: string;
  image: string;
  year?: number;
  rating?: number;
  duration?: string;
  type: "movie" | "series";
  href: string;
  className?: string;
  rank?: number;
  fullWidth?: boolean;
}

export function ContentCard({
  id,
  title,
  image,
  year,
  rating,
  duration,
  type,
  href,
  className,
  rank,
  fullWidth,
}: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const router = useRouter();
  const { isInWatchlist, toggle } = useWatchlist();
  const inWatchlist = isInWatchlist(id);

  if (rank !== undefined) {
    return (
      <div
        className={cn("group relative flex-shrink-0 flex items-stretch", className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span
          className="text-[120px] sm:text-[140px] lg:text-[160px] font-black leading-none select-none -mr-6 sm:-mr-8 z-0"
          style={{ WebkitTextStroke: "2px hsl(var(--muted-foreground) / 0.4)", color: "transparent" }}
        >
          {rank}
        </span>
        <Link href={href} className="block relative z-10">
          <div className="relative w-[130px] sm:w-[150px] lg:w-[170px] aspect-[2/3] rounded-xl overflow-hidden bg-secondary/30">
            <Image
              src={image}
              alt={title}
              fill
              className={cn(
                "object-cover transition-all duration-500",
                isHovered && "scale-110 opacity-50",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              sizes="(max-width: 640px) 130px, (max-width: 1024px) 150px, 170px"
            />
            {!imageLoaded && <div className="absolute inset-0 shimmer" />}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-300",
                isHovered ? "opacity-100" : "opacity-0"
              )}
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/90 text-[10px] font-semibold text-primary-foreground uppercase tracking-wide">
              {type}
            </div>
            {rating && (
              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-yellow-400">
                <Star className="w-3 h-3 fill-yellow-400" />
                {rating.toFixed(1)}
              </div>
            )}
            <div
              className={cn(
                "absolute inset-0 flex flex-col justify-end p-3 transition-all duration-300",
                isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Button
                  size="icon"
                  className="w-9 h-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/watch/${id}`);
                  }}
                >
                  <Play className="w-4 h-4 fill-current" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-foreground backdrop-blur-sm border border-white/10"
                  onClick={(e) => {
                    e.preventDefault();
                    toggle(id, type);
                  }}
                >
                  {inWatchlist ? <Check className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>
          <h3 className="mt-2 px-1 text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative",
        fullWidth ? "w-full" : "flex-shrink-0 w-[160px] sm:w-[180px] lg:w-[200px]",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={href} className="block">
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-secondary/30 ring-1 ring-white/5 transition-all duration-300 group-hover:ring-primary/30 group-hover:shadow-glow">
          <Image
            src={image}
            alt={title}
            fill
            className={cn(
              "object-cover transition-all duration-500",
              isHovered && "scale-110 opacity-50",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
          />
          {!imageLoaded && <div className="absolute inset-0 shimmer" />}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/90 text-[10px] font-semibold text-primary-foreground uppercase tracking-wide">
            {type}
          </div>
          {rating && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-yellow-400">
              <Star className="w-3 h-3 fill-yellow-400" />
              {rating.toFixed(1)}
            </div>
          )}
          <div
            className={cn(
              "absolute inset-0 flex flex-col justify-end p-3 transition-all duration-300",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <Button
                size="icon"
                className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/watch/${id}`);
                }}
              >
                <Play className="w-5 h-5 fill-current" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-foreground backdrop-blur-sm border border-white/10"
                onClick={(e) => {
                  e.preventDefault();
                  toggle(id, type);
                }}
              >
                {inWatchlist ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {year && <span>{year}</span>}
              {year && duration && <span className="w-1 h-1 rounded-full bg-muted-foreground" />}
              {duration && <span>{duration}</span>}
            </div>
          </div>
        </div>
        <div className="mt-2 px-1">
          <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
        </div>
      </Link>
    </div>
  );
}
