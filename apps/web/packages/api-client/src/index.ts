import type {
  AuthSession,
  BrowseResponse,
  BillingCycle,
  CatalogData,
  CastMember,
  ContentItem,
  ContentType,
  Episode,
  FeaturedItem,
  HistoryItem,
  MovieDetails,
  PlanId,
  Profile,
  SeriesDetails,
  Subscription,
  ToggleWatchlistResponse,
  User,
  UserStats,
  VideoSource,
  WatchlistItem,
} from "./types";

const accessTokenKey = "kinobot.web.accessToken";
const refreshTokenKey = "kinobot.web.refreshToken";
const listeners = new Set<(session: AuthSession | null) => void>();

type ApiErrorBody = {
  error?: { code?: string; message?: string };
  message?: string;
};

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/+$/, "");
}

function getToken(): string | null {
  return typeof window === "undefined"
    ? null
    : window.localStorage.getItem(accessTokenKey);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
  refreshOnUnauthorized = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const token = getToken();
  if (authenticated && token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiBase()}/web${path}`, {
    ...options,
    headers,
  });
  if (response.status === 401 && authenticated && refreshOnUnauthorized) {
    const refreshToken = window.localStorage.getItem(refreshTokenKey);
    if (refreshToken) {
      try {
        const rotated = await request<{
          accessToken: string;
          refreshToken: string;
          user: Record<string, unknown>;
        }>(
          "/auth/refresh",
          { method: "POST", body: JSON.stringify({ refreshToken }) },
          false,
          false,
        );
        const normalized = normalizeAuthResult(rotated);
        window.localStorage.setItem(accessTokenKey, normalized.accessToken);
        window.localStorage.setItem(refreshTokenKey, rotated.refreshToken);
        const retryHeaders = new Headers(options.headers);
        retryHeaders.set("Authorization", `Bearer ${normalized.accessToken}`);
        return request<T>(
          path,
          { ...options, headers: retryHeaders },
          true,
          false,
        );
      } catch {
        clearSession();
      }
    }
  }
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as
    T | ApiErrorBody | null;
  if (!response.ok) {
    const error = body as ApiErrorBody | null;
    const message =
      error?.error?.message ??
      error?.message ??
      `Request failed (${response.status})`;
    const result = new Error(message) as Error & {
      code?: string;
      status?: number;
    };
    result.code = error?.error?.code;
    result.status = response.status;
    throw result;
  }
  return body as T;
}

function emit(session: AuthSession | null): void {
  listeners.forEach((listener) => listener(session));
}

function saveSession(result: {
  accessToken: string;
  refreshToken: string;
  user: User;
}): AuthSession {
  window.localStorage.setItem(accessTokenKey, result.accessToken);
  window.localStorage.setItem(refreshTokenKey, result.refreshToken);
  const session = { accessToken: result.accessToken, user: result.user };
  emit(session);
  return session;
}

function clearSession(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(accessTokenKey);
    window.localStorage.removeItem(refreshTokenKey);
  }
  emit(null);
}

function normalizeUser(value: Record<string, unknown>): User {
  return {
    id: String(value.id),
    email: typeof value.email === "string" ? value.email : undefined,
    fullName:
      typeof value.fullName === "string"
        ? value.fullName
        : typeof value.name === "string"
          ? value.name
          : null,
    avatarUrl: typeof value.avatarUrl === "string" ? value.avatarUrl : null,
    plan: (typeof value.plan === "string" ? value.plan : "basic") as PlanId,
    createdAt:
      value.createdAt instanceof Date
        ? value.createdAt.toISOString()
        : String(value.createdAt ?? ""),
  };
}

function normalizeAuthResult(value: {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
}): { accessToken: string; refreshToken: string; user: User } {
  return {
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
    user: normalizeUser(value.user),
  };
}

export const auth = {
  async signIn(email: string, password: string): Promise<AuthSession> {
    return saveSession(
      normalizeAuthResult(
        await request(
          "/auth/login",
          { method: "POST", body: JSON.stringify({ email, password }) },
          false,
        ),
      ),
    );
  },
  async signUp(
    email: string,
    password: string,
    fullName: string,
  ): Promise<AuthSession> {
    return saveSession(
      normalizeAuthResult(
        await request(
          "/auth/register",
          {
            method: "POST",
            body: JSON.stringify({ email, password, name: fullName }),
          },
          false,
        ),
      ),
    );
  },
  async signOut(): Promise<void> {
    const refreshToken =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(refreshTokenKey);
    try {
      if (refreshToken) {
        await request(
          "/auth/logout",
          { method: "POST", body: JSON.stringify({ refreshToken }) },
          false,
          false,
        );
      }
    } catch {
      // Local logout must complete even when the API is unreachable.
    } finally {
      clearSession();
    }
  },
  async getSession(): Promise<AuthSession | null> {
    if (!getToken()) return null;
    try {
      const user = normalizeUser(
        await request<Record<string, unknown>>("/auth/me"),
      );
      return { accessToken: getToken() ?? "", user };
    } catch {
      clearSession();
      return null;
    }
  },
  async resetPassword(_email: string): Promise<void> {
    throw new Error("Password reset is not available for Web accounts yet");
  },
  async updatePassword(_password: string): Promise<void> {
    throw new Error("Password change is not available for Web accounts yet");
  },
  onAuthStateChange(callback: (session: AuthSession | null) => void) {
    listeners.add(callback);
    return {
      data: { subscription: { unsubscribe: () => listeners.delete(callback) } },
    };
  },
};

export const profile = {
  get: (): Promise<Profile> => request("/profile"),
  update: (updates: {
    fullName?: string;
    avatarUrl?: string;
  }): Promise<Profile> =>
    request("/profile", { method: "PATCH", body: JSON.stringify(updates) }),
  getStats: async (): Promise<UserStats> => {
    const [watchlistItems, historyItems] = await Promise.all([
      watchlist.list(),
      history.list(),
    ]);
    const moviesWatched = historyItems.filter(
      (item) => item.contentType === "movie",
    ).length;
    const seriesWatched = historyItems.filter(
      (item) => item.contentType === "series",
    ).length;
    return {
      moviesWatched,
      seriesWatched,
      hoursWatched: Math.round(moviesWatched * 2 + seriesWatched * 0.8),
      watchlist: watchlistItems.length,
    };
  },
};

export const watchlist = {
  list: async (): Promise<WatchlistItem[]> =>
    (await request<{ data: WatchlistItem[] }>("/watchlist")).data,
  toggle: (
    contentId: string,
    contentType: ContentType,
  ): Promise<ToggleWatchlistResponse> =>
    request("/watchlist/toggle", {
      method: "POST",
      body: JSON.stringify({ contentId, contentType }),
    }),
  remove: (id: string): Promise<void> =>
    request(`/watchlist/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const history = {
  list: async (): Promise<HistoryItem[]> =>
    (await request<{ data: HistoryItem[] }>("/history")).data,
  upsert: async (
    contentId: string,
    contentType: ContentType,
    progress: number,
    episode?: string | null,
  ): Promise<void> => {
    await request("/history", {
      method: "PUT",
      body: JSON.stringify({ contentId, contentType, progress, episode }),
    });
  },
  remove: (id: string): Promise<void> =>
    request(`/history/${encodeURIComponent(id)}`, { method: "DELETE" }),
  clear: (): Promise<void> => request("/history", { method: "DELETE" }),
};

export const subscriptions = {
  get: async (): Promise<Subscription | null> => {
    const result = await request<{
      subscription: { plan: string; status: string; expiresAt: string } | null;
      isPremium: boolean;
    }>("/subscriptions/current");
    if (!result.subscription) return null;
    return {
      id: "current",
      planId: result.subscription.plan as PlanId,
      billingCycle: "monthly",
      createdAt: "",
      status: result.subscription.status,
      expiresAt: result.subscription.expiresAt,
    };
  },
  listPlans: async (): Promise<
    Array<{
      id: string;
      name: string;
      tier: string;
      description: string | null;
      price: string;
      currency: string;
      durationDays: number;
    }>
  > =>
    (
      await request<{
        data: Array<{
          id: string;
          name: string;
          tier: string;
          description: string | null;
          price: string;
          currency: string;
          durationDays: number;
        }>;
      }>("/plans", {}, false)
    ).data,
  async upsert(
    _planId: PlanId,
    _billingCycle: BillingCycle,
  ): Promise<Subscription> {
    throw new Error(
      "Web self-service subscription purchase is not enabled; use the configured payment flow",
    );
  },
  async cancel(): Promise<void> {
    throw new Error(
      "Web self-service subscription cancellation is not enabled",
    );
  },
};

function toContentItem(
  row: Record<string, unknown>,
  type: ContentType,
): ContentItem {
  const duration = Number(row.duration ?? 0);
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    image: String(row.posterUrl ?? row.backgroundUrl ?? ""),
    year: row.releaseYear ? Number(row.releaseYear) : undefined,
    rating: row.ratingAvg ? Number(row.ratingAvg) : undefined,
    duration: duration
      ? `${Math.floor(duration / 60)}h ${duration % 60}m`
      : undefined,
    type,
    genres: [],
  };
}

export const content = {
  getMovies: async (): Promise<ContentItem[]> =>
    (
      await request<{ data: Record<string, unknown>[] }>("/movies", {}, false)
    ).data.map((row) => toContentItem(row, "movie")),
  listSeries: async (): Promise<ContentItem[]> =>
    (
      await request<{ data: Record<string, unknown>[] }>("/series", {}, false)
    ).data.map((row) => toContentItem(row, "series")),
  getCatalog: async (): Promise<CatalogData> => {
    const [movies, series] = await Promise.all([
      content.getMovies(),
      content.listSeries(),
    ]);
    return {
      trendingMovies: movies,
      trendingSeries: series,
      continueWatching: [],
      top10Movies: movies.slice(0, 10),
      newReleases: movies.slice(0, 10),
      featuredItems: [],
    };
  },
  getFeatured: async (): Promise<FeaturedItem[]> =>
    (await content.getCatalog()).featuredItems,
  getMovie: async (id: string): Promise<MovieDetails | null> => {
    try {
      const { data } = await request<{ data: Record<string, unknown> }>(
        `/movies/${encodeURIComponent(id)}`,
        {},
        false,
      );
      const item = toContentItem(data, "movie");
      return {
        ...item,
        description: String(data.description ?? ""),
        backdrop: String(data.backgroundUrl ?? item.image),
        poster: item.image,
        genres: [],
        director: "",
        cast: [] as CastMember[],
        language: "",
        releaseDate: String(data.releaseYear ?? ""),
      };
    } catch {
      return null;
    }
  },
  getSeriesById: async (id: string): Promise<SeriesDetails | null> => {
    try {
      const { data } = await request<{ data: Record<string, unknown> }>(
        `/series/${encodeURIComponent(id)}`,
        {},
        false,
      );
      const item = toContentItem(data, "series");
      return {
        ...item,
        description: String(data.description ?? ""),
        backdrop: String(data.backgroundUrl ?? item.image),
        poster: item.image,
        seasons: Number(data.seasonsCount ?? 0),
        episodes: Array.isArray(data.episodes) ? data.episodes.length : 0,
        genres: [],
        creator: "",
        cast: [],
        language: "",
        releaseDate: String(data.releaseYear ?? ""),
        status: "",
      };
    } catch {
      return null;
    }
  },
  getVideo: async (id: string): Promise<ContentItem | null> => {
    const movie = await content.getMovie(id);
    return movie;
  },
  getContentItem: async (id: string): Promise<ContentItem | null> =>
    (await content.getMovie(id)) ?? (await content.getSeriesById(id)),
  getSeason: async (
    seriesId: string,
    _seasonNumber: string | number,
  ): Promise<{
    series: SeriesDetails;
    episodes: Episode[];
    seasonNumber: number;
  } | null> => {
    const series = await content.getSeriesById(seriesId);
    return series
      ? { series, episodes: [], seasonNumber: Number(_seasonNumber) }
      : null;
  },
  browse: async (type?: string, genre?: string): Promise<BrowseResponse> => {
    let items =
      type === "series"
        ? await content.listSeries()
        : type === "movie"
          ? await content.getMovies()
          : [...(await content.getMovies()), ...(await content.listSeries())];
    if (genre) items = items.filter((item) => item.genres?.includes(genre));
    return {
      items,
      filters: {
        genres: [],
        years: Array.from(
          new Set(
            items
              .map((item) => item.year)
              .filter(Boolean)
              .map(String),
          ),
        ),
      },
    };
  },
  search: async (
    query: string,
    type?: string,
    genre?: string,
  ): Promise<ContentItem[]> =>
    (await content.browse(type, genre)).items.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase()),
    ),
};

export function hasApiConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_API_URL || typeof window !== "undefined",
  );
}
export async function getStream(
  id: string,
): Promise<{ streamUrl: string; expiresAt: string; quality: string }> {
  return request(`/movies/${encodeURIComponent(id)}/stream`);
}

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
