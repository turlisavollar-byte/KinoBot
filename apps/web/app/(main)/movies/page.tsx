"use client";

import { ContentGrid } from "@/components/content/lists/ContentGrid";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { useMovies } from "@/features/content";
import { Container } from "@/components/common/layout/Container";

export default function MoviesPage() {
  const { movies, loading } = useMovies();

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <main className="pb-16">
      <Container className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Movies</h1>
        <p className="text-muted-foreground">Explore our collection of movies</p>
      </Container>
      <ContentGrid items={movies} columns={5} />
    </main>
  );
}
