export type SeatTier = 'standard' | 'premium' | 'vip';

export type SeatStatus = 'available' | 'selected' | 'held' | 'booked';

export interface Seat {
  id: string;
  backendId?: number;
  row: string;
  number: number;
  tier: SeatTier;
  price: number;
  status: SeatStatus;
  heldBy?: string; // e.g. 'other' or current session
}

export interface Movie {
  id: string;
  title: string;
  tagline: string;
  genre: string[];
  durationMinutes: number;
  rating: number; // e.g. 8.9
  certification: string; // 'U/A 16+', 'A', 'PG-13'
  releaseDate: string;
  synopsis: string;
  director: string;
  cast: string[];
  languages: string[];
  formats: string[]; // 'IMAX Laser 3D', 'Dolby Cinema', '4DX', '2D'
  posterUrl: string;
  backdropUrl: string;
  trendingRank?: number;
  isFeatured?: boolean;
}

export interface Theatre {
  id: string;
  name: string;
  chain: string; // 'PVR INOX', 'Cinepolis', 'IMAX Experience'
  city: string;
  location: string;
  distanceKm: number;
  facilities: string[]; // 'Dolby Atmos', 'Laser 4K', 'Recliner Seating', 'Gourmet Food'
}

export interface Show {
  id: string;
  movieId: string;
  theatreId: string;
  screenName: string;
  format: string; // 'IMAX Laser 3D', 'Dolby Cinema', '4DX'
  date: string; // 'YYYY-MM-DD'
  time: string; // '10:30 AM', '02:15 PM', '06:45 PM', '10:00 PM'
  basePrice: number;
  pricing: {
    standard: number;
    premium: number;
    vip: number;
  };
}

export interface ConcessionItem {
  id: string;
  name: string;
  category: 'Popcorn' | 'Combos' | 'Snacks' | 'Beverages';
  description: string;
  price: number;
  imageEmoji: string;
  isVeg: boolean;
}

export interface BookingPass {
  bookingId: string;
  qrToken?: string;
  referenceHash: string;
  movie: Movie;
  theatre: Theatre;
  show: Show;
  seats: Seat[];
  concessions: { item: ConcessionItem; quantity: number }[];
  subtotalTickets: number;
  subtotalConcessions: number;
  convenienceFee: number;
  taxes: number;
  totalPaid: number;
  bookedAt: string;
  paymentMethod: string;
  paymentId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}
