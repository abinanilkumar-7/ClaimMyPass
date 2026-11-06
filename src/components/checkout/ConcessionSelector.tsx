import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { CONCESSIONS } from '../../data/mockData';
import { ConcessionItem } from '../../types';
import { ArrowLeft, Plus, Minus, Utensils, Check, ChevronRight } from 'lucide-react';

const CONCESSION_IMAGES: Record<string, string> = {
  "fnb-popcorn-truffle":
    "https://images.pexels.com/photos/7234229/pexels-photo-7234229.jpeg?auto=compress&dpr=1&h=750&w=1260",

  "fnb-popcorn-caramel":
    "https://images.pexels.com/photos/30910227/pexels-photo-30910227/free-photo-of-bowl-of-caramel-popcorn-with-chocolate-drizzle.jpeg?auto=compress&dpr=1&h=750&w=1260",

  "fnb-nacho-supremo":
    "https://images.pexels.com/photos/35628195/pexels-photo-35628195/free-photo-of-delicious-nachos-with-jalapenos-and-cheese.jpeg?auto=compress&dpr=1&h=750&w=1260",

  "fnb-combo-couples":
    "https://images.pexels.com/photos/5332073/pexels-photo-5332073.jpeg?auto=compress&dpr=1&h=750&w=1260",

  "fnb-coldbrew-latte":
    "https://images.pexels.com/photos/38860355/pexels-photo-38860355/free-photo-of-iced-cold-brew-coffee-on-marble-table-setting.jpeg?auto=compress&dpr=1&h=750&w=1260",

  "fnb-craft-soda":
    "https://images.pexels.com/photos/29002944/pexels-photo-29002944/free-photo-of-refreshing-citrus-mocktail-with-mint-garnish.jpeg?auto=compress&dpr=1&h=750&w=1260",
};

export const ConcessionSelector: React.FC = () => {
  const {
    concessionsCart,
    updateConcessionQty,
    subtotalTickets,
    subtotalConcessions,
    selectedSeatIds,
    proceedToPayment,
    setCurrentView,
  } = useBooking();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const categories = ['All', 'Popcorn', 'Combos', 'Snacks', 'Beverages'];

  const filteredItems = activeCategory === 'All'
    ? CONCESSIONS
    : CONCESSIONS.filter((c) => c.category === activeCategory);

  return (
    <div className="w-full min-h-screen bg-[#101511] pb-32">
      {/* Top Header */}
      <div className="w-full bg-[#080E09] border-b border-[#7FA35C]/20 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('seats')}
              className="p-2 rounded-lg bg-[#101511] text-zinc-300 hover:text-white border border-[#7FA35C]/30 hover:border-[#FFD900] transition-colors"
              aria-label="Back to seats"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Utensils className="w-5 h-5 text-[#648E37]" />
                Grab Your Cinema Snacks
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Fresh gourmet concessions delivered right to your seat or collected at express counters
              </p>
            </div>
          </div>

          <button
            onClick={proceedToPayment}
            className="text-xs font-semibold text-zinc-400 hover:text-[#FFD900] transition-colors px-3 py-1.5 rounded border border-white/10"
          >
            Skip to Payment &rarr;
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-white/5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-[#101511] text-[#FFD900] border border-[#FFD900] shadow-glow-yellow/20 font-bold'
                  : 'bg-[#080E09] text-zinc-400 border border-[#7FA35C]/30 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Concession Items Grid */}
        {/* Concession Items Grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredItems.map((item) => {
    const qty = concessionsCart[item.id] || 0;
    const imageUrl = CONCESSION_IMAGES[item.id];
    const imageFailed = failedImages[item.id];

    return (
      <div
        key={item.id}
        className="group flex flex-col overflow-hidden bg-[#080E09] border border-[#7FA35C]/20 rounded-2xl hover:border-[#FFD900]/60 hover:shadow-[0_8px_30px_rgba(255,217,0,0.07)] transition-all duration-300"
      >
        {/* Product Image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-[#101511]">

          {!imageFailed && imageUrl ? (
            <img
              src={imageUrl}
              alt={item.name}
              loading="lazy"
              decoding="async"
              onError={() =>
                setFailedImages((previous) => ({
                  ...previous,
                  [item.id]: true,
                }))
              }
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#648E37] gap-2">
              <Utensils className="w-10 h-10 opacity-60" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                Image unavailable
              </span>
            </div>
          )}

          {/* Image Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080E09]/80 via-transparent to-transparent pointer-events-none" />

          {/* Category */}
          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-[#080E09]/85 backdrop-blur-sm border border-white/10 text-[10px] uppercase tracking-wider font-semibold text-[#FFFC72]">
            {item.category}
          </span>

          {/* Veg Indicator */}
          {item.isVeg && (
            <span
              className="absolute top-3 left-3 w-5 h-5 rounded-sm bg-white flex items-center justify-center shadow-lg"
              title="Vegetarian"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#168B45]" />
            </span>
          )}

          {/* Price */}
          <div className="absolute top-3 right-3 bg-[#080E09]/90 backdrop-blur-sm border border-[#FFD900]/30 rounded-lg px-3 py-1.5">
            <span className="text-sm font-bold font-mono text-[#FFD900]">
              ₹{item.price}
            </span>
          </div>
        </div>

        {/* Product Information */}
        <div className="flex flex-col flex-1 p-4">

          <div className="flex-1">
            <h3 className="text-sm sm:text-base font-bold text-white mb-2 group-hover:text-[#FFFC72] transition-colors">
              {item.name}
            </h3>

            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
              {item.description}
            </p>
          </div>

          {/* Quantity Controls */}
          <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">

            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
              {qty > 0 ? `${qty} in your cart` : "Add to order"}
            </span>

            {qty === 0 ? (
              <button
                type="button"
                onClick={() => updateConcessionQty(item.id, 1)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#101511] text-[#FFD900] border border-[#FFD900]/50 hover:bg-[#FFD900] hover:text-[#080E09] transition-all flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-[#101511] border border-[#FFD900]/60 rounded-lg px-3 py-2">

                <button
                  type="button"
                  onClick={() => updateConcessionQty(item.id, -1)}
                  className="text-zinc-300 hover:text-[#FFD900] transition-colors"
                  aria-label={`Remove one ${item.name}`}
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span className="text-sm font-bold font-mono text-[#FFD900] min-w-4 text-center">
                  {qty}
                </span>

                <button
                  type="button"
                  onClick={() => updateConcessionQty(item.id, 1)}
                  className="text-zinc-300 hover:text-[#FFD900] transition-colors"
                  aria-label={`Add one ${item.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>

              </div>
            )}
          </div>
        </div>
      </div>
    );
  })}
</div>
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#080E09]/95 backdrop-blur-md border-t border-[#7FA35C]/30 p-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-zinc-400 block text-[11px]">Tickets ({selectedSeatIds.length})</span>
              <span className="text-sm font-bold text-zinc-200 font-mono tabular-nums">
                ₹{subtotalTickets}
              </span>
            </div>

            <div className="h-6 w-px bg-white/10" />

            <div>
              <span className="text-zinc-400 block text-[11px]">Food & Beverages</span>
              <span className="text-sm font-bold text-[#FFFC72] font-mono tabular-nums">
                ₹{subtotalConcessions}
              </span>
            </div>

            <div className="h-6 w-px bg-white/10" />

            <div>
              <span className="text-zinc-400 block text-[11px]">Total Before Taxes</span>
              <span className="text-base font-extrabold text-[#FFD900] font-mono tabular-nums">
                ₹{subtotalTickets + subtotalConcessions}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={proceedToPayment}
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-bold bg-[#FFD900] text-[#080E09] hover:bg-[#FFFC72] shadow-glow-yellow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to Payment</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
