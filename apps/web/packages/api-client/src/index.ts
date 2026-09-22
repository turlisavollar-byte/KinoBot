import { supabase } from "./supabase-client";
import type {
  User,
  AuthSession,
  Profile,
  ContentItem,
  ContentType,
  PlanId,
  BillingCycle,
  WatchlistItem,
  HistoryItem,
  Subscription,
  UserStats,
  ToggleWatchlistResponse,
  CastMember,
  Episode,
  VideoSource,
  MovieDetails,
  SeriesDetails,
  FeaturedItem,
  BrowseResponse,
  CatalogData,
} from "./types";
import * as contentData from "./content-data";

function parseProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    fullName: (row.full_name as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    plan: (row.plan as PlanId) ?? "basic",
    createdAt: row.created_at as string,
  };
}

function parseUser(authUser: {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; avatar_url?: string; plan?: PlanId };
  created_at: string;
}): User {
  const meta = authUser.user_metadata ?? {};
  return {
    id: authUser.id,
    email: authUser.email,
    fullName: meta.full_name ?? null,
    avatarUrl: meta.avatar_url ?? null,
    plan: meta.plan ?? "basic",
    createdAt: authUser.created_at,
  };
}

export const auth = {
  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    const user = parseUser(data.user);
    if (profileRow) {
      user.fullName = (profileRow as Record<string, unknown>)
        .full_name as string;
      user.avatarUrl = (profileRow as Record<string, unknown>)
        .avatar_url as string;
      user.plan =
        ((profileRow as Record<string, unknown>).plan as PlanId) ?? "basic";
    }

    return { accessToken: data.session?.access_token ?? "", user };
  },

  async signUp(
    email: string,
    password: string,
    fullName: string,
  ): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Sign up failed");

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      plan: "basic",
    });
    if (profileError) throw new Error(profileError.message);

    const user = parseUser(data.user);
    user.fullName = fullName;

    return { accessToken: data.session?.access_token ?? "", user };
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  async getSession(): Promise<AuthSession | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) return null;

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();

    const user = parseUser(userData.user);
    if (profileRow) {
      user.fullName = (profileRow as Record<string, unknown>)
        .full_name as string;
      user.avatarUrl = (profileRow as Record<string, unknown>)
        .avatar_url as string;
      user.plan =
        ((profileRow as Record<string, unknown>).plan as PlanId) ?? "basic";
    }

    return { accessToken: session.access_token, user };
  },

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  },

  async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },

  onAuthStateChange(callback: (session: AuthSession | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session) {
          callback(null);
          return;
        }
        const result = await auth.getSession();
        callback(result);
      })();
    });
  },
};

export const profile = {
  async get(): Promise<Profile> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Profile not found");
    return parseProfile(data as Record<string, unknown>);
  },

  async update(updates: {
    fullName?: string;
    avatarUrl?: string;
  }): Promise<Profile> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const updateData: Record<string, unknown> = {};
    if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
    if (updates.avatarUrl !== undefined)
      updateData.avatar_url = updates.avatarUrl;

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Profile not found");
    return parseProfile(data as Record<string, unknown>);
  },

  async getStats(): Promise<UserStats> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const [watchlistResult, historyResult] = await Promise.all([
      supabase.from("watchlist").select("*").eq("user_id", user.id),
      supabase.from("watch_history").select("*").eq("user_id", user.id),
    ]);

    const watchlistCount = watchlistResult.data?.length ?? 0;
    const history = historyResult.data ?? [];
    const moviesWatched = history.filter(
      (h) => (h as Record<string, unknown>).content_type === "movie",
    ).length;
    const seriesWatched = history.filter(
      (h) => (h as Record<string, unknown>).content_type === "series",
    ).length;
    const hoursWatched = Math.round(moviesWatched * 2 + seriesWatched * 0.8);

    return {
      moviesWatched,
      seriesWatched,
      hoursWatched,
      watchlist: watchlistCount,
    };
  },
};

export const watchlist = {
  async list(): Promise<WatchlistItem[]> {
    const { data, error } = await supabase.from("watchlist").select("*");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: (row as Record<string, unknown>).id as string,
      contentId: (row as Record<string, unknown>).content_id as string,
      contentType: (row as Record<string, unknown>).content_type as ContentType,
      createdAt: (row as Record<string, unknown>).created_at as string,
    }));
  },

  async toggle(
    contentId: string,
    contentType: ContentType,
  ): Promise<ToggleWatchlistResponse> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: existing } = await supabase
      .from("watchlist")
      .select("*")
      .eq("content_id", contentId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("content_id", contentId);
      if (error) throw new Error(error.message);
      return { action: "removed" };
    }

    const { data: inserted, error } = await supabase
      .from("watchlist")
      .insert({ content_id: contentId, content_type: contentType })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);

    return {
      action: "added",
      item: {
        id: (inserted as Record<string, unknown>).id as string,
        contentId: (inserted as Record<string, unknown>).content_id as string,
        contentType: (inserted as Record<string, unknown>)
          .content_type as ContentType,
        createdAt: (inserted as Record<string, unknown>).created_at as string,
      },
    };
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("watchlist").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

export const history = {
  async list(): Promise<HistoryItem[]> {
    const { data, error } = await supabase.from("watch_history").select("*");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: (row as Record<string, unknown>).id as string,
      contentId: (row as Record<string, unknown>).content_id as string,
      contentType: (row as Record<string, unknown>).content_type as ContentType,
      progress: (row as Record<string, unknown>).progress as number,
      episode: ((row as Record<string, unknown>).episode as string) ?? null,
      watchedAt: (row as Record<string, unknown>).watched_at as string,
    }));
  },

  async upsert(
    contentId: string,
    contentType: ContentType,
    progress: number,
    episode?: string | null,
  ): Promise<void> {
    const clamped = Math.max(0, Math.min(100, progress));
    const { error } = await supabase.from("watch_history").upsert(
      {
        content_id: contentId,
        content_type: contentType,
        progress: clamped,
        episode: episode ?? null,
      },
      { onConflict: "user_id,content_id" },
    );
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("watch_history")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async clear(): Promise<void> {
    const { error } = await supabase
      .from("watch_history")
      .delete()
      .neq("id", "");
    if (error) throw new Error(error.message);
  },
};

export const subscriptions = {
  async get(): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      id: (data as Record<string, unknown>).id as string,
      planId: (data as Record<string, unknown>).plan_id as PlanId,
      billingCycle: (data as Record<string, unknown>)
        .billing_cycle as BillingCycle,
      createdAt: (data as Record<string, unknown>).created_at as string,
    };
  },

  async upsert(
    planId: PlanId,
    billingCycle: BillingCycle,
  ): Promise<Subscription> {
    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        { plan_id: planId, billing_cycle: billingCycle },
        { onConflict: "user_id" },
      )
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Failed to save subscription");
    return {
      id: (data as Record<string, unknown>).id as string,
      planId: (data as Record<string, unknown>).plan_id as PlanId,
      billingCycle: (data as Record<string, unknown>)
        .billing_cycle as BillingCycle,
      createdAt: (data as Record<string, unknown>).created_at as string,
    };
  },

  async cancel(): Promise<void> {
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .neq("id", "");
    if (error) throw new Error(error.message);
  },
};

export const content = {
  getCatalog: (): CatalogData => contentData.getCatalog(),
  getFeatured: (): FeaturedItem[] => contentData.getFeatured(),
  getMovies: (): ContentItem[] => contentData.getMovies(),
  listSeries: (): ContentItem[] => contentData.listSeries(),
  getMovie: (id: string): MovieDetails | null => contentData.getMovieById(id),
  getSeriesById: (id: string): SeriesDetails | null =>
    contentData.getSeriesById(id),
  getVideo: (id: string): ContentItem | null => contentData.getVideoData(id),
  getContentItem: (id: string): ContentItem | null =>
    contentData.getContentById(id),
  getSeason: (
    seriesId: string,
    seasonNumber: string | number,
  ): {
    series: SeriesDetails;
    episodes: Episode[];
    seasonNumber: number;
  } | null => contentData.getSeason(seriesId, seasonNumber),
  browse: (type?: string, genre?: string): BrowseResponse =>
    contentData.browse(type, genre),
  search: (query: string, type?: string, genre?: string): ContentItem[] =>
    contentData.search(query, type, genre),
};

export { hasSupabaseConfig, supabase, getSupabase } from "./supabase-client";
export type {
  User,
  AuthSession,
  Profile,
  ContentItem,
  ContentType,
  PlanId,
  BillingCycle,
  WatchlistItem,
  HistoryItem,
  Subscription,
  UserStats,
  ToggleWatchlistResponse,
  CastMember,
  Episode,
  VideoSource,
  MovieDetails,
  SeriesDetails,
  FeaturedItem,
  BrowseResponse,
  CatalogData,
};
