"use client";

import { ContentGrid } from "@/components/content/lists/ContentGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSearch } from "@/features/content";
import { Container } from "@/components/common/layout/Container";
import { routes } from "@/shared/config";

const searchFilters = ["All", "Movies", "Series", "Action", "Drama", "Sci-Fi", "Comedy"];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const apiType =
    activeFilter === "Movies" ? "movie" : activeFilter === "Series" ? "series" : undefined;
  const apiGenre =
    !["All", "Movies", "Series"].includes(activeFilter) ? activeFilter : undefined;

  const { results, loading } = useSearch(query, apiType, apiGenre);

  return (
    <main className="pb-16">
      <Container className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">Search</h1>

        <div className="relative max-w-2xl mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for movies or series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-4 pl-12 pr-12 rounded-xl bg-secondary/50 border border-white/5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {searchFilters.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "rounded-full px-4",
                activeFilter === filter
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {filter}
            </Button>
          ))}
        </div>
      </Container>

      <Container>
        {query || activeFilter !== "All" ? (
          loading ? (
            <p className="text-sm text-muted-foreground">Searching...</p>
          ) : results.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {results.length} result{results.length !== 1 ? "s" : ""}
                {query && <> for &quot;{query}&quot;</>}
              </p>
              <ContentGrid items={results} columns={6} />
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="No results found"
              description={`Try a different search term or filter. We couldn't find anything matching "${query}".`}
              actionLabel="Browse all content"
              actionHref={routes.browse}
            />
          )
        ) : (
          <EmptyState
            icon={Search}
            title="Start your search"
            description="Search for movies and TV series by title or genre. Find your next favorite show."
          />
        )}
      </Container>
    </main>
  );
}
