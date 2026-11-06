import React from "react";
import type { Movie } from "../../types";
import { useBooking } from "../../context/BookingContext";
import { Play, Sparkles, Star, Calendar, Clock } from "lucide-react";

interface HeroShowcaseProps {
  movie: Movie | null;
  loading: boolean;
  error: string;
}

export const HeroShowcase: React.FC<HeroShowcaseProps> = ({
  movie: featured,
  loading,
  error,
}) => {
  const {
    setSelectedMovie,
    setIsMovieDetailOpen,
  } = useBooking();

  if (loading) {
    return (
      <section className="min-h-[360px] bg-[#101511] flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading featured movie…</p>
      </section>
    );
  }

  if (error || !featured) {
    return (
      <section className="min-h-[300px] bg-[#101511] flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <h1 className="text-2xl font-bold text-white">
            {error ? "Unable to load movies" : "No movies available"}
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            {error
              ? "Check that the Django server is running and the movie API is accessible."
              : "Active movies will appear here when they are added to the database."}
          </p>
        </div>
      </section>
    );
  }

  const openMovieDetails = () => {
  setSelectedMovie(featured);
  setIsMovieDetailOpen(true);
};

  // Keep the existing JSX below this point.
  return (
    <section className="relative w-full overflow-hidden bg-[#101511] border-b border-[#7FA35C]/20">
      {/* Background Image with Scrim Gradient */}

      <div className="absolute inset-0 z-0">
        <picture className= "absolute inset-0 block h-full w-full">
          <source media="(max-width: 767px)" srcSet={featured.posterUrl || featured.backdropUrl} />
          <img
            src={featured.backdropUrl || featured.posterUrl}
            alt={`${featured.title} cinematic backdrop`}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover object-center brightness-90"
          />
        </picture>


        {/* Desktop scrim — preserve the original lighter appearance */}
<div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#101511]/35 via-[#101511]/15 to-[#101511]/10" />

<div className="hidden md:block absolute inset-0 bg-gradient-to-t from-[#101511]/60 via-transparent to-[#101511]/10" />

{/* Mobile scrim — stronger black gradient for text readability */}
<div className="md:hidden absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15" />

<div className="md:hidden absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />
      </div>


      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 xl:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-10 xl:gap-16 items-center">
          {/* Main Info (Left 8 cols) */}
          <div className="min-w-0 space-y-5">
            {/* Unboxed clean metadata kicker */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider text-[#FFFC72]">
              <span className="flex items-center gap-1.5 text-[#FFD900]">
                <Sparkles className="w-3.5 h-3.5" />
                NOW PREMIERING
              </span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-300">IMAX EXCLUSIVE</span>
              <span className="text-zinc-500">·</span>
              <span className="text-[#648E37]">DIRECTOR’S CUT EDITION</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight [text-wrap:balance]">
              {featured.title}
            </h1>

            <p className="text-base sm:text-lg text-zinc-300 max-w-xl font-normal leading-relaxed break-words">
              {featured.synopsis}
            </p>

            {/* Movie Attributes Strip */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-300 pt-1">
              <span className="flex items-center gap-1.5 text-[#FFD900] font-semibold">
                <Star className="w-4 h-4 fill-[#FFD900]" />
                <span className="tabular-nums">{featured.rating}</span>/10 (34.2k votes)
              </span>
              <span className="text-zinc-600">·</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-[#7FA35C]" />
                <span>{Math.floor(featured.durationMinutes / 60)}h {featured.durationMinutes % 60}m</span>
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-300">{featured.certification}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-300">{featured.genre.join(', ')}</span>
            </div>

            {/* Formats list */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-zinc-400">Available in:</span>
              <div className="flex flex-wrap gap-2 text-xs font-medium text-[#FFFC72]">
                {featured.formats.map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2.5 py-1 rounded bg-[#080E09] border border-[#7FA35C]/40 text-[11px] font-mono"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                onClick={openMovieDetails}
                className="px-6 py-3 rounded-lg text-sm font-bold bg-[#FFD900] text-[#080E09] hover:bg-[#FFFC72] shadow-glow-yellow transition-all flex items-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Claim Seats Now</span>
              </button>

              <button
                onClick={() => {
                  setSelectedMovie(featured);
                  setIsMovieDetailOpen(true);
                }}
                className="px-5 py-3 rounded-lg text-sm font-semibold bg-[#080E09]/80 text-zinc-200 border border-[#7FA35C]/40 hover:border-[#FFD900] hover:text-white transition-all flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 text-[#648E37]" />
                <span>Trailer & Details</span>
              </button>
            </div>
          </div>

          {/* Poster Showcase (Right 4 cols) */}
          <div className="flex justify-center lg:justify-end min-w-0">
            <button type="button" className="relative group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD900] rounded-2xl" onClick={openMovieDetails} aria-label={`Explore showtimes for ${featured.title}`}>
              <div className="w-64 sm:w-72 xl:w-80 aspect-[2/3] rounded-2xl overflow-hidden border border-[#7FA35C]/30 shadow-2xl bg-[#080E09] transition-transform duration-300 group-hover:scale-[1.02] group-hover:border-[#FFD900]">
                <img
                  src={featured.posterUrl}
                  alt={featured.title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  width="256"
                  height="341"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 -right-3 bg-[#080E09] border border-[#648E37] text-[#FFFC72] text-[11px] font-mono px-2.5 py-1 rounded shadow-lg">
                #1 Box Office
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
