"use client";

import Link from "next/link";
import { useRef } from "react";
import { cn } from "@/shared/lib";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard } from "../cards/ContentCard";
import type { ContentItem } from "@/features/content";

interface HorizontalScrollProps {
  title: string;
  subtitle?: string;
  href?: string;
  items: ContentItem[];
  className?: string;
  showRank?: boolean;
}

export function HorizontalScroll({
  title,
  subtitle,
  href,
  items,
  className,
  showRank,
}: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 400;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className={cn("relative group", className)}>
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {href && (
            <Link
              href={href}
              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="w-10 h-10 rounded-full bg-secondary/50 hover:bg-secondary border border-white/5"
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="w-10 h-10 rounded-full bg-secondary/50 hover:bg-secondary border border-white/5"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 pb-4"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {items.map((item, index) => (
          <div key={item.id} style={{ scrollSnapAlign: "start" }}>
            <ContentCard
              id={item.id}
              title={item.title}
              image={item.image}
              year={item.year}
              rating={item.rating}
              duration={item.duration}
              type={item.type}
              href={item.type === "movie" ? `/movies/${item.id}` : `/series/${item.id}`}
              rank={showRank ? index + 1 : undefined}
            />
          </div>
        ))}
      </div>

      <div className="absolute left-0 top-1/2 -translate-y-1/2 bottom-4 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 bottom-4 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </section>
  );
}
