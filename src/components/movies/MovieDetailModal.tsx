
import React, { useEffect, useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { THEATRES } from "../../data/mockData";
import { fetchShows, type ApiShow } from "../../services/showApi";
import type { Show, Theatre } from "../../types";
import {
  X,
  Star,
  Film,
  MapPin,
} from "lucide-react";

export const MovieDetailModal: React.FC = () => {
  const {
    selectedMovie,
    isMovieDetailOpen,
    setIsMovieDetailOpen,
    selectedCity,
    selectedDate,
    setSelectedDate,
    startSeatBooking,
    showToast,
  } = useBooking();

  const [apiShows, setApiShows] = useState<ApiShow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isMovieDetailOpen || !selectedMovie) return;

    let cancelled = false;

    setLoading(true);
    setError("");

    fetchShows()
      .then((data) => {
        if (!cancelled) setApiShows(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load showtimes."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isMovieDetailOpen, selectedMovie]);

  if (!isMovieDetailOpen || !selectedMovie) return null;

  // Match the database movie ID, not the mock movie ID.

const movieShows = apiShows.filter(
  (show) =>
    String(show.movie) === String(selectedMovie.id) &&
    show.is_active &&
    new Date(show.start_time).getTime() > Date.now()
);

const availableDates = [
  ...new Set(
    movieShows.map((show) => {
      const startTime = new Date(show.start_time);

      const year = startTime.getFullYear();
      const month = String(startTime.getMonth() + 1).padStart(2, "0");
      const day = String(startTime.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    })
  ),
].sort();


  const selectShowtime = (apiShow: ApiShow) => {
    // The diagnose for the django DB
    console.log("STEP 1: selectShowtime entered", apiShow.id);

  // Keep your existing code below this line.
    console.log("Django show selected:", {
      apiShowId: apiShow.id,
      movieId: apiShow.movie,
      theatre: apiShow.theatre_name,
      startTime: apiShow.start_time,
    });
    // The current seat-booking flow uses local Theatre and Show types.
    // Match the real theatre name to existing local theatre data.
    const localTheatre = THEATRES.find(
      (theatre) =>
        theatre.name.trim().toLowerCase() ===
        apiShow.theatre_name.trim().toLowerCase()
    );
    const bookingTheatre: Theatre = localTheatre ?? {
      id: `django-theatre-${apiShow.screen}`,
      name: apiShow.theatre_name,
      chain: apiShow.theatre_name,
      city: selectedCity.name,
      location: apiShow.screen_name,
      distanceKm: 0,
      facilities: [],
    };

    console.log("CHECK 1: Theatre match:", bookingTheatre.name);

    /*if (!localTheatre) {
      showToast(
        "This theatre is not mapped to the current booking system yet.",
        "error"
      );
      return;
    }*/
    console.log("CHECK 1A: Before parsing date");
    const startTime = new Date(apiShow.start_time);
    console.log("CHECK 2: Parsed date:", startTime.toString());

    if (Number.isNaN(startTime.getTime())) {
      showToast("This show has an invalid start time.", "error");
      return;
    }

    const date = [
      startTime.getFullYear(),
      String(startTime.getMonth() + 1).padStart(2, "0"),
      String(startTime.getDate()).padStart(2, "0"),
    ].join("-");

    if (date !== selectedDate) {
      setSelectedDate(date);
      console.log("CHECK 3: Date comparison:", {
        showDate: date,
        selectedDate,
        matches: date === selectedDate,
      });
    console.log("CHECK 2: Date parsed successfully", startTime.toString());

    }

    const show: Show = {
      id: String(apiShow.id),
      movieId: String(apiShow.movie),
      theatreId: bookingTheatre.id,
      screenName: apiShow.screen_name,
      format: apiShow.format,
      date,
      time: startTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      basePrice: Number(apiShow.standard_price),
      pricing: {
        standard: Number(apiShow.standard_price),
        premium: Number(apiShow.premium_price),
        vip: Number(apiShow.vip_price),
      },
    };
    console.log("CHECK 3: Show object created", show);
    console.log("Starting seat booking with:", {
      showId: show.id,
      selectedDate,
      date,
      localTheatre: bookingTheatre.name,
    });
    console.log("STEP 2: About to start seat booking", show.id);
    startSeatBooking(selectedMovie, bookingTheatre, show);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md">
      <div className="my-8 w-full max-w-4xl overflow-hidden rounded-2xl border border-[#7FA35C]/40 bg-[#080E09] text-zinc-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7FA35C]">
              {selectedMovie.genre.join(" · ")} · {selectedCity.name}
            </p>
            <h2 className="text-2xl font-extrabold text-white">
              {selectedMovie.title}
            </h2>
            <p className="mt-1 text-sm italic text-[#FFFC72]">
              {selectedMovie.tagline}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsMovieDetailOpen(false)}
            className="rounded-full bg-black/60 p-2 text-zinc-300 hover:text-white"
            aria-label="Close movie details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-12">
          <div className="md:col-span-4">
            <img
              src={selectedMovie.posterUrl}
              alt={selectedMovie.title}
              className="aspect-[3/4] w-full rounded-xl border border-white/10 object-cover"
            />

            <div className="mt-4 space-y-3 rounded-xl bg-[#101511] p-4 text-sm">
              <p className="flex items-center justify-between">
                <span className="text-zinc-400">Rating</span>
                <span className="flex items-center gap-1 text-[#FFD900]">
                  <Star className="h-4 w-4 fill-current" />
                  {selectedMovie.rating}/10
                </span>
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-zinc-400">Runtime</span>
                <span>{selectedMovie.durationMinutes} minutes</span>
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-zinc-400">Certificate</span>
                <span>{selectedMovie.certification}</span>
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-zinc-400">Languages</span>
                <span className="text-right">
                  {selectedMovie.languages.join(", ")}
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-6 md:col-span-8">
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
                Synopsis
              </h3>
              <p className="text-sm leading-relaxed text-zinc-300">
                {selectedMovie.synopsis}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">Director</p>
                <p>{selectedMovie.director}</p>
              </div>
              <div>
                <p className="text-zinc-500">Cast</p>
                <p>{selectedMovie.cast.join(", ") || "Not specified"}</p>
              </div>
            </div>

            <section className="space-y-4 border-t border-white/10 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-bold text-[#FFD900]">
                  <Film className="h-5 w-5" />
                  Select Multiplex & Showtime
                </h3>
                <span className="text-xs text-zinc-400">
                  Date: {selectedDate}
                </span>
              </div>

              {loading && (
                <p className="text-sm text-zinc-400">
                  Loading showtimes from Django...
                </p>
              )}

              {error && (
                <div className="space-y-2">
                  <p className="text-sm text-red-400">{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setApiShows([]);
                      setError("");
                      setLoading(true);
                      fetchShows()
                        .then(setApiShows)
                        .catch((err: unknown) =>
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Unable to load showtimes."
                          )
                        )
                        .finally(() => setLoading(false));
                    }}
                    className="rounded-lg border border-white/20 px-3 py-2 text-sm"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && movieShows.length === 0 && (
                <p className="rounded-xl border border-white/10 bg-[#101511] p-4 text-sm text-zinc-400">
                  No future showtimes were found for this movie in the
                  database. Check the movie, date, and active status in
                  Django Admin.
                </p>
              )}

              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {movieShows.map((show) => (
                  <div
                    key={show.id}
                    className="rounded-xl border border-[#7FA35C]/25 bg-[#101511] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#648E37]" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-white">
                          {show.theatre_name}
                        </h4>
                        <p className="mt-1 text-xs text-zinc-400">
                          {show.screen_name} · {show.format}
                        </p>
                        <p className="mt-2 text-sm text-zinc-200">
                          {new Date(show.start_time).toLocaleString()}
                        </p>
                        <p className="mt-2 text-xs text-zinc-400">
                          Standard ₹{show.standard_price} · Premium ₹
                          {show.premium_price} · VIP ₹{show.vip_price}
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            console.log("1. Select Showtime clicked:", show.id);
                            selectShowtime(show);
                          }}
                          className="mt-3 rounded-lg bg-[#FFD900] px-4 py-2 text-sm font-bold text-[#080E09] transition hover:bg-[#FFFC72]"
                          >
                          Select Showtime
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
