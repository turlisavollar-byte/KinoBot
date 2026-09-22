"use client";

import { HorizontalScroll } from "@/components/content/lists/HorizontalScroll";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Bookmark, Clock, Crown, Mail, Calendar, Globe, Loader2, Film, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/features/auth";
import { useProfileStats } from "@/features/user";
import { useCatalog } from "@/features/content";
import { Container } from "@/components/common/layout/Container";
import { routes } from "@/shared/config";
import { formatDateLong } from "@/shared/lib";

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const { stats } = useProfileStats();
  const { data: catalog } = useCatalog();

  const continueWatching = catalog?.continueWatching ?? [];
  const trendingMovies = catalog?.trendingMovies ?? [];
  const trendingSeries = catalog?.trendingSeries ?? [];

  if (!loading && !user) {
    return (
      <main className="pb-16">
        <Container width="narrow" className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Sign in to view your profile</h1>
          <p className="text-muted-foreground mb-6">Access your watchlist, history, and settings.</p>
          <Button asChild>
            <Link href={routes.login}>Sign In</Link>
          </Button>
        </Container>
      </main>
    );
  }

  const displayName = profile?.fullName || user?.email || "Guest";
  const email = user?.email ?? "";
  const avatarUrl = profile?.avatarUrl ?? "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200";
  const memberSince = profile?.createdAt ? formatDateLong(profile.createdAt) : "Recently";
  const plan = profile?.plan ?? "Basic";

  return (
    <main className="pb-16">
      <Container>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl overflow-hidden ring-4 ring-primary/20">
                  <Image src={avatarUrl} alt={displayName} width={128} height={128} className="object-cover" />
                </div>
                <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  <Crown className="w-3 h-3 mr-1" />
                  {plan}
                </Badge>
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-2">{displayName}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{email}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Member since {memberSince}</span>
                  <span className="flex items-center gap-1"><Globe className="w-4 h-4" />English</span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" className="gap-2" asChild>
                    <Link href={routes.profileSettings}><Settings className="w-4 h-4" />Settings</Link>
                  </Button>
                  <Button variant="outline" className="gap-2" asChild>
                    <Link href={routes.profileWatchlist}><Bookmark className="w-4 h-4" />Watchlist</Link>
                  </Button>
                  <Button variant="outline" className="gap-2" asChild>
                    <Link href={routes.profileHistory}><Clock className="w-4 h-4" />History</Link>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                <div className="bg-secondary/30 rounded-xl p-4 text-center">
                  <Film className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stats.moviesWatched}</p>
                  <p className="text-xs text-muted-foreground">Movies</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-4 text-center">
                  <Tv className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stats.seriesWatched}</p>
                  <p className="text-xs text-muted-foreground">Series</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-4 text-center">
                  <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stats.hoursWatched}h</p>
                  <p className="text-xs text-muted-foreground">Watched</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-4 text-center">
                  <Bookmark className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stats.watchlist}</p>
                  <p className="text-xs text-muted-foreground">Watchlist</p>
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <HorizontalScroll title="Continue Watching" subtitle="Pick up where you left off" items={continueWatching} />
              <HorizontalScroll title="Trending Movies" subtitle="Popular right now" href={routes.movies} items={trendingMovies} />
              <HorizontalScroll title="Trending Series" subtitle="Popular right now" href={routes.series} items={trendingSeries} />
            </div>
          </>
        )}
      </Container>
    </main>
  );
}
