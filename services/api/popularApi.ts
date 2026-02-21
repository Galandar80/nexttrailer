
import { API_URL, fetchWithRetry, fetchWithAccessToken } from './config';
import { MediaItem, Article } from './types';
import { mockMovies, mockTvShows } from './mockData';
import { processMediaItems } from './utils';

export const getPopular = async (mediaType: "movie" | "tv"): Promise<MediaItem[]> => {
  try {
    const url = `${API_URL}/${mediaType}/popular?language=it-IT`;
    console.log(`Fetching popular ${mediaType}`);
    const response = await fetchWithRetry(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as { results: any[] };
    
    if (!data.results || data.results.length === 0) {
      console.warn(`No popular ${mediaType} results found`);
      throw new Error(`No popular ${mediaType} results found`);
    }
    
    return processMediaItems(data.results, mediaType);
  } catch (error) {
    console.error(`Failed to fetch popular ${mediaType}:`, error);
    // Try with access token
    try {
      const tokenUrl = `/${mediaType}/popular?language=it-IT`;
      const tokenResponse = await fetchWithAccessToken(tokenUrl);
      
      if (tokenResponse) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokenData = await tokenResponse.json() as { results: any[] };
        return processMediaItems(tokenData.results, mediaType);
      }
    } catch (tokenError) {
      console.error("Access token approach failed for popular content:", tokenError);
    }
    
    return mediaType === "movie" ? mockMovies : mockTvShows;
  }
};

export const getTopRated = async (mediaType: "movie" | "tv"): Promise<MediaItem[]> => {
  try {
    const url = `${API_URL}/${mediaType}/top_rated?language=it-IT`;
    const response = await fetchWithRetry(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as { results: any[] };
    return processMediaItems(data.results, mediaType);
  } catch (error) {
    console.error(`Failed to fetch top rated ${mediaType}`, error);
    return mediaType === "movie" ? mockMovies : mockTvShows;
  }
};

export const getUpcoming = async (): Promise<MediaItem[]> => {
  try {
    const url = `${API_URL}/movie/upcoming?language=it-IT`;
    const response = await fetchWithRetry(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as { results: any[] };
    return processMediaItems(data.results, "movie");
  } catch (error) {
    console.error("Failed to fetch upcoming movies", error);
    return mockMovies;
  }
};

export const getNowPlaying = async (): Promise<MediaItem[]> => {
  try {
    const url = `${API_URL}/movie/now_playing?language=it-IT`;
    const response = await fetchWithRetry(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as { results: any[] };
    return processMediaItems(data.results, "movie");
  } catch (error) {
    console.error("Failed to fetch now playing movies", error);
    return mockMovies;
  }
};

export const getAiringToday = async (): Promise<MediaItem[]> => {
  try {
    const url = `${API_URL}/tv/airing_today?language=it-IT`;
    const response = await fetchWithRetry(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as { results: any[] };
    return processMediaItems(data.results, "tv");
  } catch (error) {
    console.error("Failed to fetch airing today TV shows", error);
    return mockTvShows;
  }
};

export const getUpcomingAll = async (): Promise<MediaItem[]> => {
  try {
    const movieUrl = `${API_URL}/movie/upcoming?language=it-IT`;
    const tvUrl = `${API_URL}/tv/on_the_air?language=it-IT`;

    const [movieResponse, tvResponse] = await Promise.all([
      fetchWithRetry(movieUrl),
      fetchWithRetry(tvUrl)
    ]);

    const [movieData, tvData] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      movieResponse.json() as Promise<{ results: any[] }>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tvResponse.json() as Promise<{ results: any[] }>
    ]);

    const movies = processMediaItems(movieData.results, "movie");
    const tvShows = processMediaItems(tvData.results, "tv");

    // Combine and sort by popularity
    return [...movies, ...tvShows].sort((a, b) => b.popularity - a.popularity);
  } catch (error) {
    console.error("Failed to fetch upcoming content, using mock data", error);
    return [...mockMovies, ...mockTvShows];
  }
};

export const getArticles = async (mediaType: "movie" | "tv", count: number = 6): Promise<Article[]> => {
  try {
    let url: string;
    if (mediaType === "movie") {
      url = `${API_URL}/movie/now_playing?api_key=f3a3f66b6f9697a5a908d86c607ba115&language=it-IT&page=1`;
    } else {
      url = `${API_URL}/tv/on_the_air?api_key=f3a3f66b6f9697a5a908d86c607ba115&language=it-IT&page=1`;
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    return data.results.slice(0, count).map((item: MediaItem) => ({
      id: item.id,
      title: item.title || item.name || '',
      overview: item.overview,
      poster_path: item.poster_path,
      release_date: item.release_date,
      first_air_date: item.first_air_date,
      media_type: mediaType
    }));
  } catch (error) {
    console.error(`Failed to fetch articles for ${mediaType}`, error);
    if (mediaType === "movie") {
      return mockMovies.slice(0, count).map(movie => ({
        id: movie.id,
        title: movie.title!,
        overview: movie.overview,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        media_type: "movie" as const
      }));
    } else {
      return mockTvShows.slice(0, count).map(show => ({
        id: show.id,
        title: show.name!,
        overview: show.overview,
        poster_path: show.poster_path,
        first_air_date: show.first_air_date,
        media_type: "tv" as const
      }));
    }
  }
};
