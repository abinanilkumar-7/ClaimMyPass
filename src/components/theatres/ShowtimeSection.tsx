
import { useEffect, useState } from "react";
import { fetchShows, type ApiShow } from "../../services/showApi";

interface ShowtimeSectionProps {
  movieId: string;
}

export function ShowtimeSection({ movieId }: ShowtimeSectionProps) {
  const [shows, setShows] = useState<ApiShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    fetchShows()
      .then((data) => {
        if (!cancelled) {
          setShows(
            data.filter(
              (show) => String(show.movie) === movieId && show.is_active
            )
          );
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load showtimes."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  if (loading) {
    return <p className="py-4 text-sm text-zinc-400">Loading showtimes...</p>;
  }

  if (error) {
    return <p className="py-4 text-sm text-red-400">{error}</p>;
  }

  if (shows.length === 0) {
    return (
      <p className="py-4 text-sm text-zinc-400">
        No showtimes are available for this movie yet.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-bold text-white">Available Showtimes</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {shows.map((show) => (
          <div
            key={show.id}
            className={`rounded-xl border p-4 ${
              selectedShowId === show.id
                ? "border-[#FFD900] bg-[#FFD900]/10"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <p className="font-semibold text-white">{show.theatre_name}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {show.screen_name} · {show.format}
            </p>
            <p className="mt-3 text-sm text-zinc-300">
              {new Date(show.start_time).toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Standard ₹{show.standard_price} · Premium ₹{show.premium_price} ·
              VIP ₹{show.vip_price}
            </p>

            <button
              type="button"
              onClick={() => setSelectedShowId(show.id)}
              className="mt-4 rounded-lg bg-[#FFD900] px-4 py-2 text-sm font-bold text-black"
            >
              {selectedShowId === show.id ? "Selected" : "Select Showtime"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
