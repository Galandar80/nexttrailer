
export interface Genre {
  id: number;
  name: string;
}

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  profile_path?: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: "movie" | "tv" | "person";
  vote_average: number;
  overview: string;
  popularity: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  budget?: number;
  revenue?: number;
  runtime?: number;
  original_language?: string;
  production_countries?: { iso_3166_1: string; name: string }[];
  created_by?: { id: number; name: string; profile_path: string | null }[];
  episode_run_time?: number[];
  watch_providers?: {
    results?: {
      IT?: {
        buy?: { logo_path: string; provider_id: number; provider_name: string }[];
        rent?: { logo_path: string; provider_id: number; provider_name: string }[];
        flatrate?: { logo_path: string; provider_id: number; provider_name: string }[];
        link?: string;
      };
    };
  };
}

export interface Movie extends MediaItem {
  title: string;
  release_date?: string;
  runtime?: number;
}

export interface TV extends MediaItem {
  name: string;
  first_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  created_by?: { id: number; name: string; profile_path: string | null }[];
  episode_run_time?: number[];
}

export interface MediaDetails extends MediaItem {
  genres: Genre[];
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  status?: string;
  networks?: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country?: string;
  }[];
  next_episode_to_air?: {
    air_date?: string;
    season_number?: number;
    episode_number?: number;
    name?: string;
  };
  production_companies?: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
  production_countries?: { 
    iso_3166_1: string; 
    name: string 
  }[];
  credits?: {
    cast: {
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }[];
    crew: {
      id: number;
      name: string;
      job: string;
      profile_path: string | null;
    }[];
  };
  keywords?: {
    keywords?: {
      id: number;
      name: string;
    }[];
    results?: {
      id: number;
      name: string;
    }[];
  };
  budget?: number;
  revenue?: number;
  original_language?: string;
  created_by?: { 
    id: number; 
    name: string; 
    profile_path: string | null 
  }[];
  episode_run_time?: number[];
  watch_providers?: {
    results?: {
      IT?: {
        buy?: { logo_path: string; provider_id: number; provider_name: string }[];
        rent?: { logo_path: string; provider_id: number; provider_name: string }[];
        flatrate?: { logo_path: string; provider_id: number; provider_name: string }[];
        link?: string;
      };
    };
  };
}

export interface Trailer {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
  backdrop_path?: string | null;
  media_type?: "movie" | "tv";
  media_id?: number;
  media_title?: string;
}

export interface Article {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  media_type: "movie" | "tv";
}
