"use client";

import { useCatalog } from "@/features/content";
import { FeaturedCarousel } from "@/components/content/lists/FeaturedCarousel";
import { HorizontalScroll } from "@/components/content/lists/HorizontalScroll";
import { CTABanner } from "@/components/content/lists/CTABanner";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { routes } from "@/shared/config";

export default function Home() {
  const { data, loading } = useCatalog();

  if (loading || !data) {
    return <PageSkeleton />;
  }

  const featuredItems = data.featuredItems?.filter((item) => item?.id) ?? [];
  const continueWatching =
    data.continueWatching?.filter((item) => item?.id) ?? [];
  const trendingMovies = data.trendingMovies?.filter((item) => item?.id) ?? [];
  const top10Movies = data.top10Movies?.filter((item) => item?.id) ?? [];
  const trendingSeries = data.trendingSeries?.filter((item) => item?.id) ?? [];
  const newReleases = data.newReleases?.filter((item) => item?.id) ?? [];

  return (
    <main className="pt-0">
      {featuredItems.length > 0 && <FeaturedCarousel items={featuredItems} />}

      <div className="relative -mt-20 z-10 space-y-10 lg:space-y-14 pb-16">
        {continueWatching.length > 0 && (
          <HorizontalScroll
            title="Continue Watching"
            subtitle="Pick up where you left off"
            items={continueWatching}
          />
        )}

        <HorizontalScroll
          title="Trending Movies"
          subtitle="Most popular movies right now"
          href={routes.movies}
          items={trendingMovies}
        />

        <HorizontalScroll
          title="Top 10 Today"
          subtitle="Most watched in the last 24 hours"
          href="/browse?filter=top10"
          items={top10Movies}
          showRank
        />

        <HorizontalScroll
          title="Trending Series"
          subtitle="Most popular TV shows right now"
          href={routes.series}
          items={trendingSeries}
        />

        <CTABanner />

        <HorizontalScroll
          title="New Releases"
          subtitle="Fresh content just added"
          href="/browse?filter=new"
          items={newReleases}
        />
      </div>
    </main>
  );
}
