import React from 'react';
import { Movie } from '../../types';
import { useBooking } from '../../context/BookingContext';
import { Star, Clock } from 'lucide-react';
import SafeImage from '../common/SafeImage';

interface MovieCardProps {
  movie: Movie;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie }) => {
  const { startSeatBooking, setSelectedMovie, setIsMovieDetailOpen } = useBooking();

  return (
    <div className="group flex flex-col bg-[#080E09] border border-[#7FA35C]/20 rounded-xl overflow-hidden hover:border-[#FFD900]/60 transition-all duration-200">
      {/* Poster Image */}
      <div
        className="relative aspect-[3/4] w-full overflow-hidden bg-[#101511] cursor-pointer"
        onClick={() => {
          setSelectedMovie(movie);
          setIsMovieDetailOpen(true);
        }}
      >

        <SafeImage
          src={movie.posterUrl}
          alt={movie.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          width="300"
          height="400"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Ambient Bottom Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080E09] via-transparent to-transparent opacity-80" />

        {/* Rating Floating in corner */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-[#080E09]/90 border border-[#7FA35C]/40 px-2 py-0.5 rounded text-xs font-semibold text-[#FFD900] backdrop-blur-sm">
          <Star className="w-3 h-3 fill-[#FFD900]" />
          <span className="tabular-nums">{movie.rating}</span>
        </div>

        {/* Formats mini strip */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex flex-wrap gap-1">
          {movie.formats.slice(0, 3).map((fmt) => (
            <span
              key={fmt}
              className="text-[10px] font-mono text-zinc-300 bg-[#101511]/90 px-1.5 py-0.5 rounded border border-white/10"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Unboxed clean metadata with dot separators */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1.5">
            <span>{movie.genre[0]}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#7FA35C]" />
              <span>{movie.durationMinutes}m</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#648E37] font-medium">{movie.certification}</span>
          </div>

          <h3
            onClick={() => {
              setSelectedMovie(movie);
              setIsMovieDetailOpen(true);
            }}
            className="text-base font-bold text-white group-hover:text-[#FFD900] transition-colors cursor-pointer line-clamp-1"
          >
            {movie.title}
          </h3>

          <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
            {movie.synopsis}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setSelectedMovie(movie);
              setIsMovieDetailOpen(true);
            }}
            className="text-xs font-semibold text-[#7FA35C] hover:text-[#FFFC72] transition-colors py-1.5 px-2"
          >
            Details
          </button>

          <button
            onClick={() => {
              setSelectedMovie(movie);
              setIsMovieDetailOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-md text-xs font-bold bg-[#FFD900] text-[#080E09] hover:bg-[#FFFC72] shadow-sm transition-all"
          >
            Book Tickets
          </button>
        </div>
      </div>
    </div>
  );
};
