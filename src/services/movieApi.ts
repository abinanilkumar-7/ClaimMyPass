import { apiUrl } from "./api";
import type { Movie } from "../types";

interface ApiMovie {
  id: number;
  title: string;
  description: string;
  poster_url: string;
  backdrop_url?: string;
  trailer_url: string;
  language: string;
  genre: string;
  duration_minutes: number;
  release_date: string | null;
  rating: string | number;
  is_active: boolean;
  is_featured : boolean;
}

const API_URL = apiUrl("/api/movies/");

function mapMovie(movie: ApiMovie): Movie {
  const genreLabels: Record<string, string> = {
    SCIFI: "Sci-Fi",
    ACTION: "Action",
    COMEDY: "Comedy",
    DRAMA: "Drama",
    THRILLER: "Thriller",
    ROMANCE: "Romance",
    HORROR: "Horror",
    ANIMATION: "Animation",
  };

  const genre = genreLabels[movie.genre] ?? movie.genre;

  return {
    id: String(movie.id),
    title: movie.title,
    tagline: "",
    genre: [genre],
    durationMinutes: movie.duration_minutes,
    rating: Number(movie.rating),
    certification: "U/A",
    releaseDate: movie.release_date ?? "",
    synopsis: movie.description,
    director: "Not specified",
    cast: [],
    languages: [movie.language],
    formats: ["2D"],
    posterUrl: movie.poster_url || "",
    // Never use another movie's mock artwork.
    backdropUrl: movie.backdrop_url || movie.poster_url || "",
    isFeatured: movie.is_featured,
    trendingRank: undefined,
  };
}

export async function fetchMovies(): Promise<Movie[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`Failed to load movies (${response.status})`);
  }

  const data: ApiMovie[] = await response.json();

  return data
    .filter((movie) => movie.is_active)
    .map(mapMovie);
}
