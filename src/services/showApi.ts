import { apiUrl } from "./api";
const API_BASE_URL = apiUrl("/api/movies");

export interface ApiShow {
  id: number;
  movie: number;
  movie_title: string;
  screen: number;
  screen_name: string;
  theatre_id: number;
  theatre_name: string;
  start_time: string;
  format: string;
  standard_price: string;
  premium_price: string;
  vip_price: string;
  is_active: boolean;
}

export interface ApiTheatre {
  id: number;
  name: string;
  city: number;
  city_name: string;
  state: string;
  country: string;
  address: string;
  description: string;
  is_active: boolean;
}

export interface ApiCity {
  id: number;
  name: string;
  state: string;
  country: string;
  is_active: boolean;
}

async function fetchApiData<T>(url: string, resource: string): Promise<T[]> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to load ${resource} (${response.status})`
    );
  }

  const data: unknown = await response.json();

  if (Array.isArray(data)) {
    return data as T[];
  }

  if (
    data !== null &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray(data.results)
  ) {
    return data.results as T[];
  }

  return [];
}

export async function fetchShows(): Promise<ApiShow[]> {
  const shows = await fetchApiData<ApiShow>(
    `${API_BASE_URL}/shows/`,
    "showtimes"
  );

  return shows.filter((show) => show.is_active);
}

export async function fetchTheatres(): Promise<ApiTheatre[]> {
  const theatres = await fetchApiData<ApiTheatre>(
    `${API_BASE_URL}/theatres/`,
    "theatres"
  );

  return theatres.filter((theatre) => theatre.is_active);
}

export async function fetchCities(): Promise<ApiCity[]> {
  const cities = await fetchApiData<ApiCity>(
    `${API_BASE_URL}/cities/`,
    "cities"
  );

  return cities.filter((city) => city.is_active);
}
