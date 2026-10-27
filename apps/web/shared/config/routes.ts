export const routes = {
  home: "/",
  browse: "/browse",
  movies: "/movies",
  series: "/series",
  search: "/search",
  searchWithQuery: (q: string) => `/search?q=${encodeURIComponent(q)}`,
  watch: (id: string) => `/watch/${id}`,
  watchWithEpisode: (id: string, season: number, episode: number) =>
    `/watch/${id}?s=${season}&e=${episode}`,
  movie: (id: string) => `/movies/${id}`,
  seriesDetail: (id: string) => `/series/${id}`,
  season: (seriesId: string, seasonNumber: number) =>
    `/series/${seriesId}/season/${seasonNumber}`,
  subscriptions: "/subscriptions",
  billing: "/billing",
  profile: "/profile",
  profileSettings: "/profile/settings",
  profileWatchlist: "/profile/watchlist",
  profileHistory: "/profile/history",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
} as const;

export type RouteKey = keyof typeof routes;
