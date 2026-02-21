
import { MediaItem } from './types';

// Helper function to get image URLs from TMDB
export const getImageUrl = (path: string | null, size: "w92" | "w185" | "w300" | "w342" | "w500" | "w780" | "original" = "w500"): string => {
  if (!path) return "/placeholder.svg";
  if (path.startsWith("/placeholder")) {
    return "/placeholder.svg";
  }
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

// Funzione helper per normalizzare i dati dei media
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const processMediaItems = (results: any[], mediaType: "movie" | "tv"): MediaItem[] => {
  if (!results || results.length === 0) {
    console.warn(`No results found for ${mediaType}`);
    return [];
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return results.map((item: any) => ({
    id: item.id,
    title: mediaType === "movie" ? item.title : undefined,
    name: mediaType === "tv" ? item.name : undefined,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    media_type: mediaType,
    vote_average: item.vote_average || 0,
    overview: item.overview || "",
    popularity: item.popularity || 0,
    vote_count: item.vote_count || 0,
    release_date: mediaType === "movie" ? item.release_date : undefined,
    first_air_date: mediaType === "tv" ? item.first_air_date : undefined,
    genre_ids: item.genre_ids || []
  }));
};
