
import { API_URL, fetchWithRetry, fetchWithAccessToken } from './config';
import { MediaItem } from './types';
import { mockMovies, mockTvShows } from './mockData';
import { processMediaItems } from './utils';

export const getTrending = async (mediaType: "all" | "movie" | "tv", timeWindow: "day" | "week"): Promise<MediaItem[]> => {
  try {
    const url = `${API_URL}/trending/${mediaType}/${timeWindow}?language=it-IT`;
    console.log(`Fetching trending ${mediaType} for ${timeWindow}`);
    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.warn(`No trending ${mediaType} results found`);
      throw new Error(`No trending ${mediaType} results found`);
    }
    
    console.log(`Got ${data.results.length} trending results for ${mediaType}`);
    
    if (mediaType === "all") {
      return data.results.map((item: MediaItem) => {
        let validMediaType: "movie" | "tv" | "person" = "movie";
        if (item.media_type === "tv" || item.media_type === "person") {
          validMediaType = item.media_type as "tv" | "person";
        }
        
        return {
          ...item,
          media_type: validMediaType,
          genre_ids: item.genre_ids || []
        };
      });
    } else {
      return processMediaItems(data.results, mediaType);
    }
  } catch (error) {
    console.error(`Failed to fetch trending ${mediaType} content:`, error);
    // Se c'è un errore, prova a utilizzare l'access token come alternativa
    try {
      console.log(`Trying to get trending ${mediaType} with access token`);
      const tokenUrl = `/trending/${mediaType}/${timeWindow}?language=it-IT`;
      
      const tokenResponse = await fetchWithAccessToken(tokenUrl);
      const tokenData = await tokenResponse.json();
      
      if (tokenData.results && tokenData.results.length > 0) {
        console.log(`Got ${tokenData.results.length} trending results with token`);
        
        if (mediaType === "all") {
          return tokenData.results.map((item: MediaItem) => ({
            ...item,
            media_type: item.media_type || "movie",
            genre_ids: item.genre_ids || []
          }));
        } else {
          return processMediaItems(tokenData.results, mediaType);
        }
      } else {
        throw new Error("No trending results with token");
      }
    } catch (tokenError) {
      console.error("Access token approach also failed:", tokenError);
    }
    
    // Use mock data as a fallback
    console.log(`Using mock data for trending ${mediaType}`);
    return mediaType === "tv" ? mockTvShows : mockMovies;
  }
};

export const getLatestReleases = async (): Promise<MediaItem[]> => {
  try {
    const movieUrl = `${API_URL}/movie/now_playing?language=it-IT&region=IT`;
    const tvUrl = `${API_URL}/tv/airing_today?language=it-IT`;
    
    console.log("Fetching latest releases for movies and TV shows");

    const [movieResponse, tvResponse] = await Promise.all([
      fetchWithRetry(movieUrl),
      fetchWithRetry(tvUrl)
    ]);

    const [movieData, tvData] = await Promise.all([
      movieResponse.json(),
      tvResponse.json()
    ]);

    if (!movieData.results || !tvData.results) {
      throw new Error("Invalid response format");
    }
    
    console.log(`Got ${movieData.results.length} movies and ${tvData.results.length} TV shows`);

    const movies = processMediaItems(movieData.results, "movie");
    const tvShows = processMediaItems(tvData.results, "tv");

    return [...movies, ...tvShows].sort((a, b) => b.popularity - a.popularity);
  } catch (error) {
    console.error("Failed to fetch latest releases:", error);
    // Try using access token as alternative
    try {
      console.log("Trying to get latest releases with access token");
      
      const [movieTokenResp, tvTokenResp] = await Promise.all([
        fetchWithAccessToken(`/movie/now_playing?language=it-IT&region=IT`),
        fetchWithAccessToken(`/tv/airing_today?language=it-IT`)
      ]);
      
      if (movieTokenResp && tvTokenResp) {
        const [movieTokenData, tvTokenData] = await Promise.all([
          movieTokenResp.json(),
          tvTokenResp.json()
        ]);
        
        console.log(`Got ${movieTokenData.results?.length || 0} movies and ${tvTokenData.results?.length || 0} TV shows with token`);
        
        const movies = processMediaItems(movieTokenData.results, "movie");
        const tvShows = processMediaItems(tvTokenData.results, "tv");
        
        return [...movies, ...tvShows].sort((a, b) => b.popularity - a.popularity);
      }
    } catch (tokenError) {
      console.error("Access token approach also failed for latest releases:", tokenError);
    }
    
    console.log("Using mock data for latest releases");
    return [...mockMovies, ...mockTvShows];
  }
};
