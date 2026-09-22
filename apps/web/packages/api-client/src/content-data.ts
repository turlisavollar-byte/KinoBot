import type {
  ContentItem,
  ContentType,
  MovieDetails,
  SeriesDetails,
  FeaturedItem,
  Episode,
  CastMember,
  BrowseResponse,
  CatalogData,
} from "./types";

function imageUrl(id: string, width = 400): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

const trendingMovies: ContentItem[] = [
  { id: "1", title: "Dune: Part Two", image: imageUrl("7991579"), year: 2024, rating: 8.8, duration: "2h 46m", type: "movie" },
  { id: "2", title: "Oppenheimer", image: imageUrl("1117130"), year: 2023, rating: 8.9, duration: "3h 0m", type: "movie" },
  { id: "3", title: "Poor Things", image: imageUrl("7691588"), year: 2023, rating: 8.0, duration: "2h 21m", type: "movie" },
  { id: "4", title: "Killers of the Flower Moon", image: imageUrl("1486224"), year: 2023, rating: 7.6, duration: "3h 26m", type: "movie" },
  { id: "5", title: "The Batman", image: imageUrl("5231206"), year: 2022, rating: 7.8, duration: "2h 56m", type: "movie" },
  { id: "6", title: "Everything Everywhere All at Once", image: imageUrl("3758899"), year: 2022, rating: 7.8, duration: "2h 19m", type: "movie" },
  { id: "7", title: "Top Gun: Maverick", image: imageUrl("1547894"), year: 2022, rating: 8.3, duration: "2h 11m", type: "movie" },
  { id: "8", title: "Avatar: The Way of Water", image: imageUrl("1289363"), year: 2022, rating: 7.6, duration: "3h 12m", type: "movie" },
];

const trendingSeries: ContentItem[] = [
  { id: "1", title: "The Last of Us", image: imageUrl("3758899"), year: 2023, rating: 9.2, duration: "9 Episodes", type: "series" },
  { id: "2", title: "House of the Dragon", image: imageUrl("1486224"), year: 2022, rating: 8.4, duration: "10 Episodes", type: "series" },
  { id: "3", title: "Wednesday", image: imageUrl("5231206"), year: 2022, rating: 8.1, duration: "8 Episodes", type: "series" },
  { id: "4", title: "The Bear", image: imageUrl("7691588"), year: 2022, rating: 8.7, duration: "8 Episodes", type: "series" },
  { id: "5", title: "Succession", image: imageUrl("1117130"), year: 2023, rating: 9.3, duration: "10 Episodes", type: "series" },
  { id: "6", title: "Shogun", image: imageUrl("1547894"), year: 2024, rating: 8.8, duration: "10 Episodes", type: "series" },
  { id: "7", title: "True Detective", image: imageUrl("1289363"), year: 2024, rating: 8.5, duration: "6 Episodes", type: "series" },
  { id: "8", title: "Fallout", image: imageUrl("7991579"), year: 2024, rating: 8.7, duration: "8 Episodes", type: "series" },
];

const continueWatching: ContentItem[] = [
  { id: "1", title: "The Last of Us", image: imageUrl("3758899"), year: 2023, rating: 9.2, duration: "S1 E5", type: "series" },
  { id: "2", title: "Dune: Part Two", image: imageUrl("7991579"), year: 2024, rating: 8.8, duration: "1h 23m left", type: "movie" },
  { id: "3", title: "Oppenheimer", image: imageUrl("1117130"), year: 2023, rating: 8.9, duration: "45m left", type: "movie" },
  { id: "4", title: "House of the Dragon", image: imageUrl("1486224"), year: 2022, rating: 8.4, duration: "S2 E3", type: "series" },
];

const top10Movies: ContentItem[] = [
  { id: "1", title: "Dune: Part Two", image: imageUrl("7991579"), year: 2024, rating: 8.8, type: "movie" },
  { id: "2", title: "Oppenheimer", image: imageUrl("1117130"), year: 2023, rating: 8.9, type: "movie" },
  { id: "3", title: "Poor Things", image: imageUrl("7691588"), year: 2023, rating: 8.0, type: "movie" },
  { id: "4", title: "Killers of the Flower Moon", image: imageUrl("1486224"), year: 2023, rating: 7.6, type: "movie" },
  { id: "5", title: "The Batman", image: imageUrl("5231206"), year: 2022, rating: 7.8, type: "movie" },
  { id: "6", title: "Everything Everywhere", image: imageUrl("3758899"), year: 2022, rating: 7.8, type: "movie" },
  { id: "7", title: "Top Gun: Maverick", image: imageUrl("1547894"), year: 2022, rating: 8.3, type: "movie" },
  { id: "8", title: "Avatar: The Way of Water", image: imageUrl("1289363"), year: 2022, rating: 7.6, type: "movie" },
  { id: "9", title: "Barbie", image: imageUrl("7691588"), year: 2023, rating: 6.9, type: "movie" },
  { id: "10", title: "Interstellar", image: imageUrl("7991579"), year: 2014, rating: 8.7, type: "movie" },
];

const newReleases: ContentItem[] = [
  { id: "1", title: "Civil War", image: imageUrl("7991579"), year: 2024, rating: 7.4, duration: "1h 49m", type: "movie" },
  { id: "2", title: "The Fall Guy", image: imageUrl("1547894"), year: 2024, rating: 7.0, duration: "2h 6m", type: "movie" },
  { id: "3", title: "Challengers", image: imageUrl("7691588"), year: 2024, rating: 7.4, duration: "2h 11m", type: "movie" },
  { id: "4", title: "Kingdom of the Planet of the Apes", image: imageUrl("1289363"), year: 2024, rating: 7.8, duration: "2h 25m", type: "movie" },
  { id: "5", title: "Furiosa", image: imageUrl("1486224"), year: 2024, rating: 7.6, duration: "2h 28m", type: "movie" },
  { id: "6", title: "Inside Out 2", image: imageUrl("1117130"), year: 2024, rating: 8.0, duration: "1h 36m", type: "movie" },
];

const allMovies: ContentItem[] = [
  ...trendingMovies,
  { id: "9", title: "Civil War", image: imageUrl("7991579"), year: 2024, rating: 7.4, duration: "1h 49m", type: "movie" },
  { id: "10", title: "The Fall Guy", image: imageUrl("1547894"), year: 2024, rating: 7.0, duration: "2h 6m", type: "movie" },
  { id: "11", title: "Challengers", image: imageUrl("7691588"), year: 2024, rating: 7.4, duration: "2h 11m", type: "movie" },
  { id: "12", title: "Kingdom of the Planet of the Apes", image: imageUrl("1289363"), year: 2024, rating: 7.8, duration: "2h 25m", type: "movie" },
];

const allSeries: ContentItem[] = [
  ...trendingSeries,
  { id: "9", title: "The White Lotus", image: imageUrl("7691588"), year: 2022, rating: 8.0, duration: "6 Episodes", type: "series" },
  { id: "10", title: "Euphoria", image: imageUrl("3758899"), year: 2022, rating: 8.3, duration: "8 Episodes", type: "series" },
  { id: "11", title: "Breaking Bad", image: imageUrl("1486224"), year: 2013, rating: 9.5, duration: "62 Episodes", type: "series" },
  { id: "12", title: "Game of Thrones", image: imageUrl("1547894"), year: 2019, rating: 9.2, duration: "73 Episodes", type: "series" },
];

const browseContent: ContentItem[] = [
  { id: "1", title: "Dune: Part Two", image: imageUrl("7991579"), year: 2024, rating: 8.8, duration: "2h 46m", type: "movie", genres: ["Sci-Fi", "Action"] },
  { id: "2", title: "Oppenheimer", image: imageUrl("1117130"), year: 2023, rating: 8.9, duration: "3h 0m", type: "movie", genres: ["Drama", "History"] },
  { id: "3", title: "The Last of Us", image: imageUrl("3758899"), year: 2023, rating: 9.2, duration: "9 Episodes", type: "series", genres: ["Drama", "Horror"] },
  { id: "4", title: "House of the Dragon", image: imageUrl("1486224"), year: 2022, rating: 8.4, duration: "10 Episodes", type: "series", genres: ["Drama", "Fantasy"] },
  { id: "5", title: "Poor Things", image: imageUrl("7691588"), year: 2023, rating: 8.0, duration: "2h 21m", type: "movie", genres: ["Drama", "Comedy"] },
  { id: "6", title: "The Batman", image: imageUrl("5231206"), year: 2022, rating: 7.8, duration: "2h 56m", type: "movie", genres: ["Action", "Crime"] },
  { id: "7", title: "Wednesday", image: imageUrl("5231206"), year: 2022, rating: 8.1, duration: "8 Episodes", type: "series", genres: ["Comedy", "Mystery"] },
  { id: "8", title: "Succession", image: imageUrl("1117130"), year: 2023, rating: 9.3, duration: "10 Episodes", type: "series", genres: ["Drama"] },
  { id: "9", title: "Top Gun: Maverick", image: imageUrl("1547894"), year: 2022, rating: 8.3, duration: "2h 11m", type: "movie", genres: ["Action", "Drama"] },
  { id: "10", title: "Shogun", image: imageUrl("1547894"), year: 2024, rating: 8.8, duration: "10 Episodes", type: "series", genres: ["Drama", "History"] },
  { id: "11", title: "Avatar: The Way of Water", image: imageUrl("1289363"), year: 2022, rating: 7.6, duration: "3h 12m", type: "movie", genres: ["Sci-Fi", "Adventure"] },
  { id: "12", title: "Fallout", image: imageUrl("7991579"), year: 2024, rating: 8.7, duration: "8 Episodes", type: "series", genres: ["Drama", "Sci-Fi"] },
];

const allContent: ContentItem[] = [...allMovies, ...allSeries];

const featuredItems: FeaturedItem[] = [
  {
    id: "1",
    title: "Dune: Part Two",
    description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe.",
    image: imageUrl("7991579", 500),
    backdrop: imageUrl("7991579", 1920),
    year: 2024,
    rating: 8.8,
    duration: "2h 46m",
    genres: ["Sci-Fi", "Action", "Drama"],
    type: "movie",
  },
  {
    id: "2",
    title: "The Last of Us",
    description: "After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity's last hope.",
    image: imageUrl("3758899", 500),
    backdrop: imageUrl("3758899", 1920),
    year: 2023,
    rating: 9.2,
    duration: "9 Episodes",
    genres: ["Drama", "Horror", "Adventure"],
    type: "series",
  },
  {
    id: "3",
    title: "Oppenheimer",
    description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    image: imageUrl("1117130", 500),
    backdrop: imageUrl("1117130", 1920),
    year: 2023,
    rating: 8.9,
    duration: "3h 0m",
    genres: ["Biography", "Drama", "History"],
    type: "movie",
  },
];

const castPool: CastMember[] = [
  { id: "1", name: "Timothee Chalamet", role: "Lead Actor", image: imageUrl("220453", 100) },
  { id: "2", name: "Zendaya", role: "Lead Actress", image: imageUrl("7691588", 100) },
  { id: "3", name: "Rebecca Ferguson", role: "Supporting", image: imageUrl("3758899", 100) },
  { id: "4", name: "Josh Brolin", role: "Supporting", image: imageUrl("1117130", 100) },
  { id: "5", name: "Austin Butler", role: "Supporting", image: imageUrl("1486224", 100) },
];

const directors = ["Denis Villeneuve", "Christopher Nolan", "Greta Gerwig", "Ryan Coogler"];
const creators = ["Craig Mazin", "Vince Gilligan", "Taylor Sheridan", "Phoebe Waller-Bridge"];

export const genres = ["All", "Action", "Drama", "Sci-Fi", "Comedy", "Horror", "Fantasy", "Mystery", "History", "Adventure", "Crime"];
export const years = ["All Years", "2024", "2023", "2022", "2021", "2020+"];

function extractPhotoId(url: string): string {
  const match = url.match(/photos\/(\d+)/);
  return match ? match[1] : "7991579";
}

function buildMovieDetails(item: ContentItem): MovieDetails {
  const photoId = extractPhotoId(item.image);
  return {
    ...item,
    description: `Experience ${item.title}, a captivating ${item.genres?.[0] ?? "drama"} film from ${item.year}. With a rating of ${item.rating}/10, this is one of the most acclaimed releases of the year.`,
    backdrop: imageUrl(photoId, 1920),
    poster: imageUrl(photoId, 500),
    genres: item.genres ?? ["Drama"],
    director: directors[parseInt(item.id, 10) % directors.length] ?? "Unknown",
    cast: castPool,
    language: "English",
    releaseDate: `January 1, ${item.year}`,
  };
}

function buildSeriesDetails(item: ContentItem): SeriesDetails {
  const photoId = extractPhotoId(item.image);
  const episodeCount = parseInt(item.duration ?? "10") || 10;
  return {
    ...item,
    description: `${item.title} is a gripping ${item.genres?.[0] ?? "drama"} series that premiered in ${item.year}. With a rating of ${item.rating}/10, it has captivated audiences worldwide.`,
    backdrop: imageUrl(photoId, 1920),
    poster: imageUrl(photoId, 500),
    seasons: Math.max(1, Math.ceil(episodeCount / 10)),
    episodes: episodeCount,
    genres: item.genres ?? ["Drama"],
    creator: creators[parseInt(item.id, 10) % creators.length] ?? "Unknown",
    cast: castPool,
    language: "English",
    releaseDate: `January 1, ${item.year}`,
    status: "Ongoing",
  };
}

function buildEpisodes(item: ContentItem): Episode[] {
  const photoId = extractPhotoId(item.image);
  const titles = ["Pilot", "The Beginning", "Crossroads", "The Turning Point", "Revelations"];
  return titles.map((title, i) => ({
    id: `${item.id}-${i + 1}`,
    number: i + 1,
    title,
    duration: `${45 + i * 3}m`,
    image: imageUrl(photoId),
    description: `Episode ${i + 1} of ${item.title}. The story continues with unexpected twists and character developments.`,
  }));
}

export function getCatalog(): CatalogData {
  return {
    trendingMovies,
    trendingSeries,
    continueWatching,
    top10Movies,
    newReleases,
    featuredItems,
  };
}

export function getFeatured(): FeaturedItem[] {
  return featuredItems;
}

export function getMovies(): ContentItem[] {
  return allMovies;
}

export function listSeries(): ContentItem[] {
  return allSeries;
}

export function getMovieById(id: string): MovieDetails | null {
  const item = allMovies.find((m) => m.id === id);
  if (!item) return null;
  return { ...buildMovieDetails(item), similar: getSimilarMovies(id) };
}

export function getSeriesById(id: string): SeriesDetails | null {
  const item = allSeries.find((s) => s.id === id);
  if (!item) return null;
  return {
    ...buildSeriesDetails(item),
    episodesList: buildEpisodes(item),
    similar: getSimilarSeries(id),
  };
}

export function getEpisodesBySeriesId(id: string): Episode[] {
  const item = allSeries.find((s) => s.id === id);
  if (!item) return [];
  return buildEpisodes(item);
}

export function getSimilarMovies(id: string): ContentItem[] {
  return allMovies.filter((m) => m.id !== id).slice(0, 6);
}

export function getSimilarSeries(id: string): ContentItem[] {
  return allSeries.filter((s) => s.id !== id).slice(0, 5);
}

export function browse(type?: string, genre?: string): BrowseResponse {
  let items = browseContent;
  if (type && type !== "all") items = items.filter((i) => i.type === type);
  if (genre && genre !== "All") items = items.filter((i) => i.genres?.includes(genre));
  return { items, filters: { genres, years } };
}

export function search(query: string, type?: string, genre?: string): ContentItem[] {
  const q = query.toLowerCase();
  let items = allContent.filter(
    (i) =>
      i.title.toLowerCase().includes(q) ||
      i.genres?.some((g) => g.toLowerCase().includes(q))
  );
  if (type && type !== "all") items = items.filter((i) => i.type === type);
  if (genre && genre !== "All") items = items.filter((i) => i.genres?.includes(genre));
  return items;
}

export function getContentById(id: string): ContentItem | null {
  return allContent.find((i) => i.id === id) ?? null;
}

export function getVideoData(id: string): ContentItem | null {
  return allContent.find((i) => i.id === id) ?? null;
}

export function getSeason(
  seriesId: string,
  seasonNumber: string | number
): { series: SeriesDetails; episodes: Episode[]; seasonNumber: number } | null {
  const series = getSeriesById(seriesId);
  if (!series) return null;
  return {
    series,
    episodes: buildEpisodes({ ...series, id: seriesId }),
    seasonNumber: Number(seasonNumber),
  };
}
