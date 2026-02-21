
import { API_URL, fetchWithRetry } from './config';
import { MediaDetails, Trailer, MediaItem, Genre } from './types';
import { mockMovies, mockTvShows, mockGenres } from './mockData';

export const getDetails = async (id: number | string, mediaType: "movie" | "tv"): Promise<MediaDetails> => {
  try {
    const detailsUrl = `${API_URL}/${mediaType}/${id}?language=it-IT`;
    const detailsPromise = fetchWithRetry(detailsUrl);

    const creditsUrl = `${API_URL}/${mediaType}/${id}/credits?language=it-IT`;
    const creditsPromise = fetchWithRetry(creditsUrl);

    const keywordsUrl = `${API_URL}/${mediaType}/${id}/keywords`;
    const keywordsPromise = fetchWithRetry(keywordsUrl);

    const providersUrl = `${API_URL}/${mediaType}/${id}/watch/providers`;
    const providersPromise = fetchWithRetry(providersUrl);

    const [detailsRes, creditsRes, keywordsRes, providersRes] = await Promise.all([
      detailsPromise,
      creditsPromise,
      keywordsPromise,
      providersPromise
    ]);

    const details = await detailsRes.json();
    const credits = await creditsRes.json();
    const keywords = await keywordsRes.json();
    const providers = await providersRes.json();

    return {
      ...details,
      credits: credits,
      keywords: keywords,
      watch_providers: providers,
      media_type: mediaType,
      genre_ids: details.genre_ids || details.genres?.map((g: Genre) => g.id) || []
    } as MediaDetails;
  } catch (error) {
    console.error(`Failed to fetch details for ${mediaType}:${id}`, error);
    if (mediaType === "movie") {
      return {
        ...mockMovies[0],
        genres: mockGenres.slice(0, 3),
        media_type: "movie"
      } as MediaDetails;
    } else {
      return {
        ...mockTvShows[0],
        genres: mockGenres.slice(0, 3),
        media_type: "tv"
      } as MediaDetails;
    }
  }
};

export const getTrailers = async (id: number | string, mediaType: "movie" | "tv"): Promise<Trailer[]> => {
  try {
    if ((typeof id === 'number' && id <= 102 && id >= 1) ||
      (typeof id === 'string' && ['1', '2', '101', '102'].includes(id))) {
      return [{
        id: "mock-trailer",
        key: "dQw4w9WgXcQ",
        name: "Trailer di esempio",
        site: "YouTube",
        type: "Trailer",
        official: true,
        published_at: "2023-01-01",
        media_type: mediaType
      }];
    }

    const url = `${API_URL}/${mediaType}/${id}/videos?language=it-IT`;
    const response = await fetchWithRetry(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      const enUrl = `${API_URL}/${mediaType}/${id}/videos?language=en-US`;
      const enResponse = await fetchWithRetry(enUrl);
      const enData = await enResponse.json();
      return (enData.results || [])
        .filter((video: Trailer) => video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser"))
        .map((video: Trailer) => ({
          ...video,
          media_type: mediaType
        }));
    }

    return (data.results || [])
      .filter((video: Trailer) => video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser"))
      .map((video: Trailer) => ({
        ...video,
        media_type: mediaType
      }));
  } catch (error) {
    console.error("Failed to fetch trailers", error);
    return [{
      id: "mock-trailer",
      key: "dQw4w9WgXcQ",
      name: "Trailer di esempio",
      site: "YouTube",
      type: "Trailer",
      official: true,
      published_at: "2023-01-01",
      media_type: mediaType
    }];
  }
};

export const getMovieDetails = async (id: string): Promise<MediaDetails> => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const url = `${API_URL}/movie/${id}?api_key=${apiKey}&language=it-IT`;
    const response = await fetchWithRetry(url);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch movie details", error);
    const fallbackMovie = mockMovies.find(m => m.id === parseInt(id)) || mockMovies[0];
    return {
      ...fallbackMovie,
      genres: mockGenres.slice(0, 3),
      media_type: "movie"
    } as MediaDetails;
  }
};

export const getTVShowDetails = async (id: string): Promise<MediaDetails> => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const url = `${API_URL}/tv/${id}?api_key=${apiKey}&language=it-IT`;
    const response = await fetchWithRetry(url);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch TV show details", error);
    const fallbackTv = mockTvShows.find(t => t.id === parseInt(id)) || mockTvShows[0];
    return {
      ...fallbackTv,
      genres: mockGenres.slice(0, 3),
      media_type: "tv"
    } as MediaDetails;
  }
};

export const getSimilar = async (id: number | string, mediaType: "movie" | "tv"): Promise<MediaItem[]> => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const url = `${API_URL}/${mediaType}/${id}/similar?api_key=${apiKey}&language=it-IT`;
    const response = await fetchWithRetry(url);
    const data = await response.json();
    return (data.results || []).map((item: MediaItem) => ({
      ...item,
      media_type: mediaType
    }));
  } catch (error) {
    console.error("Failed to fetch similar content", error);
    return [];
  }
};
