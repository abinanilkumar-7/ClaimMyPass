import React from 'react';
import { motion } from 'framer-motion';
import { useBooking } from '../../context/BookingContext';
import { SeatLegend } from './SeatLegend';
import { Seat, SeatTier } from '../../types';
import { ArrowLeft, Clock, Film, MapPin, Sparkles, ChevronRight, ShieldCheck } from 'lucide-react';

export const SeatGrid: React.FC = () => {
  const {
    selectedMovie,
    selectedTheatre,
    selectedShow,
    currentSeats,
    selectedSeatIds,
    toggleSeatSelection,
    subtotalTickets,
    proceedToConcessions,
    returnToBrowse,
    selectedDate,
  } = useBooking();

  if (!selectedMovie || !selectedTheatre || !selectedShow) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400">No active showtime selected.</p>
        <button
          onClick={returnToBrowse}
          className="mt-4 px-4 py-2 rounded-lg bg-[#FFD900] text-[#080E09] font-bold"
        >
          Browse Movies
        </button>
      </div>
    );
  }

  // Group seats by tier and row
  const tiers: { tier: SeatTier; label: string; rows: string[]; price: number }[] = [
    { tier: 'vip', label: 'VIP Recliner Deck', rows: ['K', 'J'], price: selectedShow.pricing.vip },
    { tier: 'premium', label: 'Prime Panoramic Deck', rows: ['H', 'G', 'F', 'E'], price: selectedShow.pricing.premium },
    { tier: 'standard', label: 'Classic Deck', rows: ['D', 'C', 'B', 'A'], price: selectedShow.pricing.standard },
  ];
  const allRows = tiers.flatMap((t) => t.rows);

  // Helper for styling each seat button
  const getSeatClass = (seat: Seat, isSelected: boolean) => {
    const base =
      'relative flex items-center justify-center rounded-t-lg text-[11px] font-mono transition-all duration-150 select-none';


    if (seat.status === 'booked') {
      return `${base} bg-white/5 border border-white/10 text-white/20 cursor-not-allowed pointer-events-none`;
    }

    // Let the current user's selected seat remain visibly selected,
    // even when Django reports its database status as "held".
    if (isSelected) {
      return `${base} bg-[#FFD900] text-[#080E09] font-bold shadow-glow-yellow scale-105 z-10`;
    }

    if (seat.status === 'held') {
      return `${base} bg-[rgba(255,252,114,0.15)] border border-[#FFFC72]/60 text-[#FFFC72] animate-pulse cursor-not-allowed`;
    }


    if (seat.tier === 'vip' || seat.tier === 'premium') {
      return `${base} bg-[#080E09] border border-[#648E37] text-[#648E37] hover:bg-[#648E37] hover:text-[#080E09] hover:scale-105 cursor-pointer`;
    }

    // Standard available
    return `${base} bg-[#080E09] border border-[#7FA35C]/40 text-[#FFFC72]/70 hover:border-[#FFD900] hover:scale-105 cursor-pointer`;
  };

  const selectedSeats = currentSeats.filter((s) => selectedSeatIds.includes(s.id));

  return (
    <div className="w-full min-h-screen bg-[#101511] pb-32 overflow-x-hidden">
      {/* Top Showtime Info Header */}
      <div className="w-full bg-[#080E09] border-b border-[#7FA35C]/20 px-4 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={returnToBrowse}
              className="p-2 rounded-lg bg-[#101511] text-zinc-300 hover:text-white border border-[#7FA35C]/30 hover:border-[#FFD900] transition-colors cursor-pointer"
              aria-label="Back to movie list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{selectedMovie.title}</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#101511] text-[#FFFC72] border border-[#648E37]">
                  {selectedShow.format}
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <span className="text-zinc-200">{selectedTheatre.name}</span>
                <span className="text-zinc-600">·</span>
                <span>{selectedShow.screenName}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-[#648E37]">{selectedDate} at {selectedShow.time}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right hidden sm:block">
              <span className="text-zinc-400 block">Inventory Guarantee</span>
              <span className="text-[#648E37] font-semibold flex items-center gap-1 justify-end">
                <ShieldCheck className="w-3.5 h-3.5" /> Direct Redis Locks
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auditorium Container */}
      <div className="max-w-5xl mx-auto px-4 pt-8">
        {/* Curved Cinema Screen */}
        <div className="relative mb-10 flex flex-col items-center">
          {/* Curved glowing screen bar */}
          <div className="w-full max-w-2xl h-3 rounded-[50%] bg-gradient-to-b from-[#FFFC72]/50 to-transparent shadow-[0_-10px_25px_rgba(255,252,114,0.3)] mb-3" />
          <div className="text-[11px] font-mono tracking-widest text-[#FFFC72]/70 uppercase">
            All Eyes This Way · Curved Cinema Screen
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6">
          <SeatLegend />
        </div>

        {/* Mobile Horizontal Scroll Guide */}
        <div className="md:hidden text-center pb-2 text-[11px] text-zinc-500 font-mono">
          &larr; Drag seating deck horizontally to view all rows &rarr;
        </div>

        {/* Seating Grid by Tiers */}
        <div className="space-y-8 bg-[#080E09]/60 border border-[#7FA35C]/15 rounded-2xl p-4 sm:p-8 backdrop-blur-sm overflow-x-auto overscroll-x-contain">
          {tiers.map((tierGroup) => (
            <div key={tierGroup.tier} className="space-y-3 min-w-[620px]">
              {/* Tier Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5 text-xs">
                <span className="font-bold text-[#FFFC72] uppercase tracking-wider flex items-center gap-2">
                  {tierGroup.tier === 'vip' && <Sparkles className="w-3.5 h-3.5 text-[#FFD900]" />}
                  {tierGroup.label}
                </span>
                <span className="font-mono text-zinc-400 tabular-nums">
                  ₹{tierGroup.price}
                </span>
              </div>

              {/* Rows within this tier */}
              <div className="space-y-2.5">
                {tierGroup.rows.map((rowLetter) => {
                  const rowSeats = currentSeats.filter((s) => s.row === rowLetter);
                  const half = Math.ceil(rowSeats.length / 2);
                  const leftBlock = rowSeats.slice(0, half);
                  const rightBlock = rowSeats.slice(half);
                  const rowOverallIndex = allRows.indexOf(rowLetter);

                  return (
                    <motion.div
                      key={rowLetter}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        delay: Math.max(0, rowOverallIndex) * 0.04,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                      className="flex items-center justify-center gap-2 sm:gap-4"
                    >
                      {/* Row Label Left */}
                      <span className="w-5 text-center text-xs font-mono font-bold text-zinc-500">
                        {rowLetter}
                      </span>

                      {/* Left Block */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {leftBlock.map((seat) => {
                          const isSelected = selectedSeatIds.includes(seat.id);
                          const seatW = tierGroup.tier === 'vip' ? 'w-8 sm:w-9 h-8' : 'w-7 sm:w-8 h-7 sm:h-8';
                          return (
                            <button
                              key={seat.id}
                              onClick={() => toggleSeatSelection(seat)}
                              disabled={seat.status === 'booked' || seat.status === 'held'}
                              className={`${seatW} ${getSeatClass(seat, isSelected)}`}
                              title={`Seat ${seat.id} - ${seat.tier.toUpperCase()} - ₹${seat.price} (${seat.status})`}
                            >
                              <span>{seat.number}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Center Aisle Gap */}
                      <div className="w-6 sm:w-10 text-center text-[10px] text-zinc-700 font-mono select-none">
                        |
                      </div>

                      {/* Right Block */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {rightBlock.map((seat) => {
                          const isSelected = selectedSeatIds.includes(seat.id);
                          const seatW = tierGroup.tier === 'vip' ? 'w-8 sm:w-9 h-8' : 'w-7 sm:w-8 h-7 sm:h-8';
                          return (
                            <button
                              key={seat.id}
                              onClick={() => toggleSeatSelection(seat)}
                              disabled={
                                  seat.status === 'booked' ||
                                  (seat.status === 'held' && !isSelected)
                              }
                              className={`${seatW} ${getSeatClass(seat, isSelected)}`}
                              title={`Seat ${seat.id} - ${seat.tier.toUpperCase()} - ₹${seat.price} (${seat.status})`}
                            >
                              <span>{seat.number}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Row Label Right */}
                      <span className="w-5 text-center text-xs font-mono font-bold text-zinc-500">
                        {rowLetter}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Booking Action Bar */}
      {selectedSeatIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#080E09]/95 backdrop-blur-md border-t border-[#7FA35C]/30 p-4 shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">Selected Seats ({selectedSeatIds.length})</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {selectedSeats.map((s) => (
                    <span
                      key={s.id}
                      className="px-2 py-0.5 rounded bg-[#101511] border border-[#FFD900] text-[#FFD900] font-mono font-bold"
                    >
                      {s.id}
                    </span>
                  ))}
                </div>
              </div>

              <div className="h-8 w-px bg-white/10 hidden sm:block" />

              <div>
                <span className="text-zinc-400 block text-[11px]">Total Ticket Price</span>
                <span className="text-lg font-bold text-[#FFFC72] font-mono tabular-nums">
                  ₹{subtotalTickets}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={proceedToConcessions}
                className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-bold bg-[#FFD900] text-[#080E09] hover:bg-[#FFFC72] shadow-glow-yellow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Food & Beverages</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
