
// Main API export file
import { getImageUrl } from './api/utils';
import { getTrending, getLatestReleases } from './api/trendingApi';
import { getDetails, getTrailers, getMovieDetails, getTVShowDetails, getSimilar } from './api/detailsApi';
import { search } from './api/searchApi';
import { getGenres, getContentByGenre } from './api/genresApi';
import {
  getPopular, getTopRated, getUpcoming, getNowPlaying, getAiringToday,
  getUpcomingAll, getArticles
} from './api/popularApi';
import { discoverMedia, discoverAll } from './api/discoverApi';
import { getPersonDetails, getPersonCredits } from './api/personApi';

// Re-export types
export type {
  Genre,
  MediaItem,
  Movie,
  TV,
  MediaDetails,
  Trailer,
  Article
} from './api/types';

// Export all API functions
export const tmdbApi = {
  getImageUrl,
  getTrending,
  getLatestReleases,
  getPopular,
  getGenres,
  getMovieDetails,
  getTVShowDetails,
  getDetails,
  getTrailers,
  search,
  getTopRated,
  getUpcoming,
  getNowPlaying,
  getAiringToday,
  getContentByGenre,
  getArticles,
  getUpcomingAll,
  discoverMedia,
  discoverAll,
  getPersonDetails,
  getPersonCredits,
  getSimilar
};
