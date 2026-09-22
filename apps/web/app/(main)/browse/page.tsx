"use client";

import { ContentGrid } from "@/components/content/lists/ContentGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { useBrowse } from "@/features/content";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { Container } from "@/components/common/layout/Container";

export default function BrowsePage() {
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "series">("all");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [sortBy, setSortBy] = useState<"rating" | "year" | "title">("rating");
  const [showFilters, setShowFilters] = useState(false);

  const apiType = typeFilter === "all" ? undefined : typeFilter;
  const apiGenre = selectedGenre === "All" ? undefined : selectedGenre;
  const { data, loading } = useBrowse(apiType, apiGenre);

  if (loading || !data) {
    return <PageSkeleton />;
  }

  const allItems = data.items;
  const genres = data.filters.genres;
  const years = data.filters.years;

  const filteredContent = allItems
    .filter((item) => selectedYear === "All Years" || item.year?.toString() === selectedYear)
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "year") return (b.year || 0) - (a.year || 0);
      return a.title.localeCompare(b.title);
    });

  return (
    <main className="pb-16 space-y-8">
      <Container>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Browse</h1>
        <p className="text-muted-foreground">Discover movies and series</p>
      </Container>

      <Container className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/50 rounded-full p-1">
            <Button
              size="sm"
              variant={typeFilter === "all" ? "default" : "ghost"}
              className="rounded-full"
              onClick={() => setTypeFilter("all")}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={typeFilter === "movie" ? "default" : "ghost"}
              className="rounded-full"
              onClick={() => setTypeFilter("movie")}
            >
              Movies
            </Button>
            <Button
              size="sm"
              variant={typeFilter === "series" ? "default" : "ghost"}
              className="rounded-full"
              onClick={() => setTypeFilter("series")}
            >
              Series
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const sorts: Array<"rating" | "year" | "title"> = ["rating", "year", "title"];
              const currentIndex = sorts.indexOf(sortBy);
              setSortBy(sorts[(currentIndex + 1) % sorts.length]);
            }}
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort by {sortBy}
          </Button>

          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="gap-2 lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </Button>

          {(selectedGenre !== "All" || selectedYear !== "All Years") && (
            <div className="flex items-center gap-2">
              {selectedGenre !== "All" && (
                <Badge variant="secondary" className="gap-1">
                  {selectedGenre}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedGenre("All")} />
                </Badge>
              )}
              {selectedYear !== "All Years" && (
                <Badge variant="secondary" className="gap-1">
                  {selectedYear}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedYear("All Years")} />
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className={`flex flex-wrap items-center gap-3 ${showFilters ? "" : "hidden lg:flex"}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Genre:</span>
            <div className="flex flex-wrap gap-1">
              {genres.slice(0, 6).map((genre) => (
                <Button
                  key={genre}
                  size="sm"
                  variant={selectedGenre === genre ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genre}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Year:</span>
            <select
              className="bg-secondary/50 border border-white/10 rounded-md px-3 py-1.5 text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </Container>

      <Container>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">{filteredContent.length} results</p>
        </div>
        <ContentGrid items={filteredContent} columns={6} />
      </Container>
    </main>
  );
}
