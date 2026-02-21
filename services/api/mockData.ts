
import { Genre, MediaItem } from './types';

// Mock data for when the API is unavailable
export const mockGenres: Genre[] = [
  { id: 28, name: "Azione" },
  { id: 12, name: "Avventura" },
  { id: 16, name: "Animazione" },
  { id: 35, name: "Commedia" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentario" },
  { id: 18, name: "Drammatico" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 10749, name: "Romantico" },
  { id: 878, name: "Fantascienza" },
  { id: 53, name: "Thriller" }
];

export const mockMovies: MediaItem[] = [
  {
    id: 1,
    title: "Film di esempio 1",
    poster_path: "/placeholder.jpg",
    backdrop_path: "/placeholder-backdrop.jpg",
    media_type: "movie",
    vote_average: 7.5,
    overview: "Questo è un film di esempio per quando l'API non è disponibile",
    popularity: 100,
    vote_count: 500,
    release_date: "2023-05-15",
    genre_ids: [28, 12]
  },
  {
    id: 2,
    title: "Film di esempio 2",
    poster_path: "/placeholder2.jpg",
    backdrop_path: "/placeholder-backdrop2.jpg",
    media_type: "movie",
    vote_average: 8.2,
    overview: "Un altro film di esempio",
    popularity: 95,
    vote_count: 450,
    release_date: "2023-06-20",
    genre_ids: [35, 18]
  }
];

export const mockTvShows: MediaItem[] = [
  {
    id: 101,
    name: "Serie TV di esempio 1",
    poster_path: "/placeholder-tv1.jpg",
    backdrop_path: "/placeholder-tv-backdrop1.jpg",
    media_type: "tv",
    vote_average: 8.0,
    overview: "Questa è una serie TV di esempio per quando l'API non è disponibile",
    popularity: 90,
    vote_count: 400,
    first_air_date: "2023-01-10",
    genre_ids: [18, 10759]
  },
  {
    id: 102,
    name: "Serie TV di esempio 2",
    poster_path: "/placeholder-tv2.jpg",
    backdrop_path: "/placeholder-tv-backdrop2.jpg",
    media_type: "tv",
    vote_average: 8.5,
    overview: "Un'altra serie TV di esempio",
    popularity: 85,
    vote_count: 350,
    first_air_date: "2023-03-15",
    genre_ids: [80, 10765]
  }
];
