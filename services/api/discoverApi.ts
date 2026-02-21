import { API_URL, fetchWithRetry } from './config';
import { MediaItem } from './types';
import { processMediaItems } from './utils';
import { mockMovies, mockTvShows } from './mockData';

export interface DiscoverFilters {
    mediaType: 'movie' | 'tv';
    year?: number;
    genre?: number;
    sortBy?: string;
    page?: number;
    query?: string;
    with_networks?: number;
    with_watch_providers?: string;
}

/**
 * Discover media con filtri avanzati usando TMDB discover API
 */
export async function discoverMedia(filters: DiscoverFilters): Promise<MediaItem[]> {
    try {
        const { mediaType, year, genre, sortBy = 'popularity.desc', page = 1, query } = filters;

        // Se c'è una query di ricerca, usa search API invece di discover
        if (query && query.trim()) {
            const searchUrl = `${API_URL}/search/${mediaType}?query=${encodeURIComponent(query)}&page=${page}&language=it-IT`;
            const response = await fetchWithRetry(searchUrl);
            const data = await response.json();
            return processMediaItems(data.results, mediaType);
        }

        // Costruisci URL discover
        let url = `${API_URL}/discover/${mediaType}?language=it-IT&page=${page}`;

        // Aggiungi filtro anno
        if (year) {
            const yearParam = mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year';
            url += `&${yearParam}=${year}`;
        }

        // Aggiungi filtro genere
        if (genre) {
            url += `&with_genres=${genre}`;
        }

        // Aggiungi ordinamento
        if (sortBy) {
            url += `&sort_by=${sortBy}`;
        }

        // Aggiungi filtro providers (streaming)
        if (filters.with_watch_providers) {
            url += `&with_watch_providers=${filters.with_watch_providers}&watch_region=IT`;
        }

        // Aggiungi filtro network (es. HBO)
        if (filters.with_networks) {
            url += `&with_networks=${filters.with_networks}`;
        }

        console.log('Discover URL:', url);

        const response = await fetchWithRetry(url);
        const data = await response.json();

        return processMediaItems(data.results, mediaType);
    } catch (error) {
        console.error('Error discovering media:', error);
        return filters.mediaType === "movie" ? mockMovies : mockTvShows;
    }
}

/**
 * Discover combinato per movies e TV shows
 */
export async function discoverAll(filters: Omit<DiscoverFilters, 'mediaType'>): Promise<{
    movies: MediaItem[];
    tvShows: MediaItem[];
}> {
    try {
        const [movies, tvShows] = await Promise.all([
            discoverMedia({ ...filters, mediaType: 'movie' }),
            discoverMedia({ ...filters, mediaType: 'tv' })
        ]);

        return { movies, tvShows };
    } catch (error) {
        console.error('Error discovering all media:', error);
        return { movies: [], tvShows: [] };
    }
}
