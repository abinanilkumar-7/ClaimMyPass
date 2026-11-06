
import React, { useEffect, useMemo, useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { fetchMovies } from '../../services/movieApi';
import {
  fetchShows,
  fetchTheatres,
  type ApiShow,
  type ApiTheatre,
} from '../../services/showApi';
import type { Movie, Show, Theatre } from '../../types';
import { MapPin, Film, LoaderCircle, RefreshCw } from 'lucide-react';

function getLocalDate(dateValue: string) {
  const date = new Date(dateValue);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatTime(dateValue: string) {
  return new Date(dateValue).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function mapTheatre(item: ApiTheatre): Theatre {
  return {
    id: String(item.id),
    name: item.name,
    chain: 'Cinema',
    city: item.city_name,
    location: item.address,
    distanceKm: 0,
    facilities: [],
  };
}

function mapShow(item: ApiShow): Show {
  const start = new Date(item.start_time);

  return {
    id: String(item.id),
    movieId: String(item.movie),
    theatreId: String(item.theatre_id),
    screenName: item.screen_name,
    format: item.format.replaceAll('_', ' '),
    date: getLocalDate(item.start_time),
    time: formatTime(item.start_time),
    basePrice: Number(item.standard_price),
    pricing: {
      standard: Number(item.standard_price),
      premium: Number(item.premium_price),
      vip: Number(item.vip_price),
    },
  };
}

export const TheatresList: React.FC = () => {
  const {
    selectedCity,
    selectedDate,
    startSeatBooking,
    showToast,
  } = useBooking();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [theatres, setTheatres] = useState<ApiTheatre[]>([]);
  const [shows, setShows] = useState<ApiShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [movieData, theatreData, showData] = await Promise.all([
        fetchMovies(),
        fetchTheatres(),
        fetchShows(),
      ]);

      setMovies(movieData);
      setTheatres(theatreData);
      setShows(showData);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to load cinema listings.';

      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // Load database listings when the component mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const movieById = useMemo(
    () => new Map(movies.map((movie) => [movie.id, movie])),
    [movies],
  );

  const mappedTheatres = useMemo(
    () => theatres.map(mapTheatre),
    [theatres],
  );

  const cityTheatres = useMemo(() => {
    const cityName = selectedCity.name.trim().toLocaleLowerCase();

    return mappedTheatres.filter(
      (theatre) =>
        theatre.city.trim().toLocaleLowerCase() === cityName,
    );
  }, [mappedTheatres, selectedCity.name]);

  const showsByTheatre = useMemo(() => {
    const grouped = new Map<string, Show[]>();

    for (const item of shows) {
      if (!item.is_active) continue;

      const mapped = mapShow(item);

      if (mapped.date !== selectedDate) continue;

      // Don't display shows that have already started.
      if (new Date(item.start_time).getTime() <= Date.now()) continue;

      const list = grouped.get(mapped.theatreId) ?? [];
      list.push(mapped);
      grouped.set(mapped.theatreId, list);
    }

    for (const list of grouped.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time));
    }

    return grouped;
  }, [shows, selectedDate]);

  return (
    <section
      id="theatres-section"
      className="py-12 border-t border-[#7FA35C]/20"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-semibold text-[#648E37] uppercase tracking-wider block">
            Multiplex Circuit
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Cinemas in {selectedCity.name}
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Movies and showtimes from your cinema database
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">
            {selectedDate}
          </span>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[#7FA35C]/40 px-3 py-2 text-xs text-zinc-200 hover:border-[#FFD900] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-zinc-400">
          <LoaderCircle className="w-5 h-5 animate-spin" />
          Loading cinemas and showtimes…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-900/60 bg-[#080E09] p-8 text-center">
          <p className="text-sm text-red-300 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-lg bg-[#FFD900] px-4 py-2 text-sm font-bold text-[#080E09]"
          >
            Try again
          </button>
        </div>
      ) : cityTheatres.length === 0 ? (
        <div className="rounded-xl border border-[#7FA35C]/20 bg-[#080E09] p-10 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-3 text-[#648E37]" />
          <h3 className="font-bold text-white mb-2">
            No cinemas found in {selectedCity.name}
          </h3>
          <p className="text-sm text-zinc-400">
            Choose another city using the city selector above.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {cityTheatres.map((theatre) => {
            const theatreShows =
              showsByTheatre.get(theatre.id) ?? [];

            // Only list movies that have upcoming shows at this theatre.
            const moviesAtTheatre = new Map<
              string,
              { movie: Movie; shows: Show[] }
            >();

            for (const show of theatreShows) {
              const movie = movieById.get(show.movieId);
              if (!movie) continue;

              const existing = moviesAtTheatre.get(movie.id);

              if (existing) {
                existing.shows.push(show);
              } else {
                moviesAtTheatre.set(movie.id, {
                  movie,
                  shows: [show],
                });
              }
            }

            return (
              <article
                key={theatre.id}
                className="rounded-2xl border border-[#7FA35C]/25 bg-[#080E09] p-4 sm:p-6 transition-colors hover:border-[#648E37]"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {theatre.name}
                    </h3>

                    <p className="mt-1 flex items-start gap-2 text-xs text-zinc-400">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#648E37]" />
                      <span>{theatre.location}</span>
                    </p>
                  </div>

                  <span className="text-xs text-zinc-400">
                    {moviesAtTheatre.size} movie
                    {moviesAtTheatre.size === 1 ? '' : 's'} available
                  </span>
                </div>

                {moviesAtTheatre.size === 0 ? (
                  <p className="py-6 text-sm text-zinc-500">
                    No upcoming shows at this cinema for the selected date.
                  </p>
                ) : (
                  <div className="pt-4 space-y-4">
                    {[...moviesAtTheatre.values()].map(
                      ({ movie, shows: movieShows }) => (
                        <div
                          key={movie.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-white/5 bg-[#101511]/60 p-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-[#080E09]">
                              {movie.posterUrl && (
                                <img
                                  src={movie.posterUrl}
                                  alt={movie.title}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white">
                                {movie.title}
                              </h4>
                              <p className="mt-1 text-[11px] text-zinc-400">
                                {movie.certification} ·{' '}
                                {movie.languages[0] ?? 'Language not specified'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {movieShows.map((show) => (
                              <button
                                key={show.id}
                                type="button"
                                onClick={() =>
                                  startSeatBooking(movie, theatre, show)
                                }
                                className="group flex min-w-[84px] flex-col items-center rounded-lg border border-[#7FA35C]/40 bg-[#080E09] px-3 py-2 transition-colors hover:border-[#FFD900] hover:bg-[#FFD900]"
                              >
                                <span className="text-xs font-bold tabular-nums text-[#FFFC72] group-hover:text-[#080E09]">
                                  {show.time}
                                </span>
                                <span className="mt-0.5 text-[9px] text-zinc-400 group-hover:text-[#080E09]">
                                  {show.format}
                                </span>
                                <span className="mt-0.5 text-[9px] text-zinc-500 group-hover:text-[#080E09]">
                                  From ₹{show.basePrice}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
