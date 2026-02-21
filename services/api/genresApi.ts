
import { API_URL, fetchWithRetry } from './config';
import { Genre, MediaItem } from './types';
import { mockGenres, mockMovies, mockTvShows } from './mockData';
import { processMediaItems } from './utils';

export const getGenres = async (mediaType: "movie" | "tv"): Promise<Genre[]> => {
  try {
    const url = `${API_URL}/genre/${mediaType}/list?language=it-IT`;
    const response = await fetchWithRetry(url);
    const data = await response.json() as { genres: Genre[] };
    return data.genres;
  } catch (error) {
    console.error(`Failed to fetch genres for ${mediaType}, using mock genres`, error);
    return mockGenres;
  }
};

export const getContentByGenre = async (
  mediaType: "movie" | "tv",
  genreId: number,
  page: number = 1,
  filters?: {
    sortBy?: string;
    year?: string;
  }
): Promise<MediaItem[]> => {
  try {
    console.log(`Fetching content for genre ${genreId}, media type ${mediaType}, page ${page}, filters:`, filters);

    let url = `${API_URL}/discover/${mediaType}?with_genres=${genreId}&page=${page}&language=it-IT`;

    // Aggiungi filtri opzionali
    if (filters?.sortBy) {
      url += `&sort_by=${filters.sortBy}`;
    }

    if (filters?.year) {
      const yearParam = mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year';
      url += `&${yearParam}=${filters.year}`;
    }

    const response = await fetchWithRetry(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as { results: any[] };
    console.log(`Got ${data.results?.length || 0} results for genre ${genreId}`);
    return processMediaItems(data.results, mediaType);
  } catch (error) {
    console.error(`Failed to fetch content for genre ${genreId}`, error);
    const mockData = mediaType === "movie"
      ? mockMovies.filter(m => m.genre_ids.includes(genreId))
      : mockTvShows.filter(t => t.genre_ids.includes(genreId));

    // If no matching items found, return at least one item to avoid empty UI
    return mockData.length > 0 ? mockData : (mediaType === "movie" ? [mockMovies[0]] : [mockTvShows[0]]);
  }
};
