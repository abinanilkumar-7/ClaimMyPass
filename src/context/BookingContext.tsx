import React, { createContext, useContext, useState, useEffect } from 'react';
import { Movie, Theatre, Show, Seat, ConcessionItem, BookingPass } from '../types';
import { CITIES, MOVIES, THEATRES, CONCESSIONS, getShowsForMovieAndTheatre, generateShowSeating } from '../data/mockData';
import {
  fetchSeats,
  createSeatHold,
  releaseSeatHold,
} from '../services/seatApi';
import { getStoredUser, type AuthUser } from '../services/authApi';
import { fetchMyBookings } from "../services/paymentApi";


type BookingView =
  | 'browse'
  | 'seats'
  | 'concessions'
  | 'payment'
  | 'ticket-pass'
  | 'my-passes'
  | 'sign-in'
  | 'sign-up'
  | 'forgot-password'
  | 'reset-password'
  | 'staff-scanner'
  | '404';


interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface BookingContextType {
  // Navigation & modals
  currentView: BookingView;
  setCurrentView: (view: BookingView) => void;

  user: AuthUser | null;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;

  selectedCity: (typeof CITIES)[0];
  setSelectedCity: (city: (typeof CITIES)[0]) => void;

  isCityModalOpen: boolean;
  setIsCityModalOpen: (open: boolean) => void;

  // Toast notifications
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: () => void;

  // Selected entities
  selectedMovie: Movie | null;
  setSelectedMovie: (movie: Movie | null) => void;
  isMovieDetailOpen: boolean;
  setIsMovieDetailOpen: (open: boolean) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedTheatre: Theatre | null;
  setSelectedTheatre: (theatre: Theatre | null) => void;
  selectedShow: Show | null;
  setSelectedShow: (show: Show | null) => void;

  // Seating & Holds
  currentSeats: Seat[];
  selectedSeatIds: string[];
  toggleSeatSelection: (seat: Seat) => void;
  holdSecondsLeft: number;
  isHoldActive: boolean;
  holdToken: string | null;
  releaseHold: () => void;

  // Concessions
  concessionsCart: Record<string, number>;
  updateConcessionQty: (itemId: string, delta: number) => void;
  clearConcessions: () => void;

  // Calculations
  subtotalTickets: number;
  subtotalConcessions: number;
  convenienceFee: number;
  taxes: number;
  grandTotal: number;

  // Finalized passes & active pass
  activePass: BookingPass | null;
  setActivePass: (pass: BookingPass | null) => void;
  myPasses: BookingPass[];
  refreshMyPasses: () => Promise<BookingPass[]>;
activateConfirmedPass: (pass: BookingPass) => void;
  completeBooking: (customer: { name: string; phone: string; email: string; paymentMethod: string }) => BookingPass;
  cancelBookingPass: (bookingId: string) => void;

  // Navigation helpers
  startSeatBooking: (movie: Movie, theatre?: Theatre, show?: Show) => void;
  proceedToConcessions: () => void;
  proceedToPayment: () => void;
  returnToBrowse: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const LOCAL_STORAGE_PASSES_KEY = 'claimmypass_user_passes_v1';
const SESSION_STORAGE_HOLD_KEY = 'claimmypass_active_hold_v1';
const HOLD_DURATION_SECONDS = 600; // 10 minutes

export interface StoredHoldSession {
  movieId: string;
  theatreId: string;
  showId: string;
  seatIds: string[];
  holdToken?: string;
  holdStartedAt: number;
  expiresAt: number;
  view?: BookingView;
  concessionsCart?: Record<string, number>;
  selectedDate?: string;
}

function loadInitialHold(): {
  holdSession: StoredHoldSession | null;
  movie: Movie | null;
  theatre: Theatre | null;
  show: Show | null;
  secondsLeft: number;
} {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return { holdSession: null, movie: null, theatre: null, show: null, secondsLeft: 0 };
    }
    const raw = sessionStorage.getItem(SESSION_STORAGE_HOLD_KEY);
    if (!raw) {
      return { holdSession: null, movie: null, theatre: null, show: null, secondsLeft: 0 };
    }
    const parsed: StoredHoldSession = JSON.parse(raw);
    const now = Date.now();
    const remainingMs = parsed.expiresAt - now;

    if (remainingMs > 0 && Array.isArray(parsed.seatIds) && parsed.seatIds.length > 0) {
      const movie = MOVIES.find((m) => m.id === parsed.movieId) || MOVIES[0];
      const theatre = THEATRES.find((t) => t.id === parsed.theatreId) || THEATRES[0];
      const date = parsed.selectedDate || new Date().toISOString().split('T')[0];
      const shows = getShowsForMovieAndTheatre(movie.id, theatre.id, date);
      const show = shows.find((s) => s.id === parsed.showId) || shows[0];
      const secondsLeft = Math.max(0, Math.floor(remainingMs / 1000));

      return {
        holdSession: parsed,
        movie,
        theatre,
        show,
        secondsLeft,
      };
    } else {
      // Clean up expired hold
      sessionStorage.removeItem(SESSION_STORAGE_HOLD_KEY);
    }
  } catch {
    // Graceful fallback for parse or storage restrictions
  }
  return { holdSession: null, movie: null, theatre: null, show: null, secondsLeft: 0 };
}

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialHold = React.useMemo(() => loadInitialHold(), []);

  const [currentView, setCurrentView] = useState<BookingView>(
    initialHold.holdSession?.view || (initialHold.holdSession ? 'seats' : 'browse')
    );
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  // Toast notification state
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3500);
  };

  const dismissToast = () => setToast(null);

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(initialHold.movie);
  const [isMovieDetailOpen, setIsMovieDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    initialHold.holdSession?.selectedDate || new Date().toISOString().split('T')[0]
  );
  const [selectedTheatre, setSelectedTheatre] = useState<Theatre | null>(initialHold.theatre);
  const [selectedShow, setSelectedShow] = useState<Show | null>(initialHold.show);

  const [currentSeats, setCurrentSeats] = useState<Seat[]>(() => {
    if (initialHold.show) {
      return generateShowSeating(initialHold.show.id, initialHold.show.pricing);
    }
    return [];
  });
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>(initialHold.holdSession?.seatIds || []);
  const [holdToken, setHoldToken] = useState<string | null>(initialHold.holdSession?.holdToken ?? null);
  const [holdExpiryTimestamp, setHoldExpiryTimestamp] = useState<number | null>(
    initialHold.holdSession?.expiresAt || null
  );
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(initialHold.secondsLeft);
  const [isHoldActive, setIsHoldActive] = useState<boolean>(
    Boolean(initialHold.holdSession && initialHold.secondsLeft > 0)
  );

  const [concessionsCart, setConcessionsCart] = useState<Record<string, number>>(
    initialHold.holdSession?.concessionsCart || {}
  );
  const [activePass, setActivePass] = useState<BookingPass | null>(null);
  const [myPasses, setMyPasses] = useState<BookingPass[]>([]);

  // Initialize stored passes
  // Load confirmed bookings from Django.
useEffect(() => {
  let cancelled = false;

  const loadPasses = async () => {
    if (!user) {
      setMyPasses([]);
      setActivePass(null);
      return;
    }

    try {
      const passes = await fetchMyBookings();

      if (!cancelled) {
        setMyPasses(passes);
      }
    } catch (error) {
      console.error("Failed to load confirmed bookings:", error);

      if (!cancelled) {
        setMyPasses([]);
      }
    }
  };

  void loadPasses();

  return () => {
    cancelled = true;
  };
}, [user]);

  // Helper to persist the active 10-minute hold session to sessionStorage
  const persistHoldToSession = (
    seatIdsToStore: string[],
    expiryMs: number,
    viewOverride?: BookingView,
    cartOverride?: Record<string, number>,
    movieOverride?: Movie | null,
    theatreOverride?: Theatre | null,
    showOverride?: Show | null
  ) => {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return;

      if (!seatIdsToStore || seatIdsToStore.length === 0) {
        sessionStorage.removeItem(SESSION_STORAGE_HOLD_KEY);
        return;
      }

      const activeMovie = movieOverride !== undefined ? movieOverride : selectedMovie;
      const activeTheatre = theatreOverride !== undefined ? theatreOverride : selectedTheatre;
      const activeShow = showOverride !== undefined ? showOverride : selectedShow;

      const payload: StoredHoldSession = {
        movieId: activeMovie?.id || '',
        theatreId: activeTheatre?.id || '',
        showId: activeShow?.id || '',
        seatIds: seatIdsToStore,
        holdToken: holdToken ?? undefined,
        holdStartedAt: expiryMs - HOLD_DURATION_SECONDS * 1000,
        expiresAt: expiryMs,
        view: viewOverride || currentView,
        concessionsCart: cartOverride || concessionsCart,
        selectedDate,
      };

      sessionStorage.setItem(SESSION_STORAGE_HOLD_KEY, JSON.stringify(payload));
    } catch {
      // Safely ignore storage quotas or restrictions
    }
  };

  const handleSetCurrentView = (view: BookingView) => {
    setCurrentView(view);
    if (isHoldActive && holdExpiryTimestamp && selectedSeatIds.length > 0) {
      persistHoldToSession(selectedSeatIds, holdExpiryTimestamp, view);
    }
  };

  // Save passes to localStorage whenever changed
  const savePasses = (passes: BookingPass[]) => {
  setMyPasses(passes);
};

const refreshMyPasses = async (): Promise<BookingPass[]> => {
  const passes = await fetchMyBookings();
  setMyPasses(passes);
  return passes;
};

const activateConfirmedPass = (pass: BookingPass) => {
  setMyPasses((previous) => [
    pass,
    ...previous.filter((item) => item.bookingId !== pass.bookingId),
  ]);

  setActivePass(pass);

  // Clear local seat-selection and hold state.
  setSelectedSeatIds([]);
  setHoldToken(null);
  setIsHoldActive(false);
  setHoldExpiryTimestamp(null);
  setHoldSecondsLeft(0);
  setConcessionsCart({});

  try {
    sessionStorage.removeItem(SESSION_STORAGE_HOLD_KEY);
    localStorage.removeItem(LOCAL_STORAGE_PASSES_KEY);
  } catch {
    // Ignore browser storage errors.
  }

  showToast(
    `Payment verified. Your pass for ${pass.movie.title} is ready!`,
    "success"
  );

  setCurrentView("ticket-pass");
};

  // Generate seating grid when show changes

  // Load database-backed seats for Django shows; retain mock seating for demo shows.
  useEffect(() => {
    let cancelled = false;

    const loadSeats = async () => {
      if (!selectedShow) {
        setCurrentSeats([]);
        return;
      }

      if (!/^\d+$/.test(selectedShow.id)) {
        setCurrentSeats(
          generateShowSeating(selectedShow.id, selectedShow.pricing)
        );
        return;
      }

      try {
        const apiSeats = await fetchSeats(Number(selectedShow.id));
        console.log("API seats received:", apiSeats.length, apiSeats);

        if (cancelled) return;

        const mappedSeats: Seat[] = apiSeats.map((seat) => ({
          id: `${seat.row}${seat.number}`,
          backendId: seat.id,
          row: seat.row,
          number: seat.number,
          tier: seat.tier,
          price: Number(seat.price),
          status: seat.status,
        }));
        console.log("Mapped seats:", mappedSeats.length, mappedSeats);

        setCurrentSeats(mappedSeats);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load seats:", error);
          showToast("Unable to load seats. Please try again.", "error");
          setCurrentSeats([]);
        }
      }
    };

    void loadSeats();

    return () => {
      cancelled = true;
    };
  }, [selectedShow]);


  // Real-time timestamp-based hold countdown timer with tab-focus / reload resilience

useEffect(() => {
  if (!isHoldActive || !holdExpiryTimestamp) return;

  let expired = false;

  const tick = () => {
    if (expired) return;

    const now = Date.now();
    const remainingMs = holdExpiryTimestamp - now;
    const seconds = Math.max(0, Math.floor(remainingMs / 1000));

    setHoldSecondsLeft(seconds);

    if (seconds <= 0) {
      // Prevent repeated expiry handling.
      expired = true;

      setIsHoldActive(false);
      setHoldExpiryTimestamp(null);
      setHoldSecondsLeft(0);
      setSelectedSeatIds([]);
      setHoldToken(null);

      try {
        sessionStorage.removeItem(SESSION_STORAGE_HOLD_KEY);
      } catch {
        // Ignore sessionStorage errors.
      }

      if (selectedShow) {
        if (/^\d+$/.test(selectedShow.id)) {
          // Django-backed show: fetch the real seat availability.
          void fetchSeats(Number(selectedShow.id))
            .then((apiSeats) => {
              setCurrentSeats(
                apiSeats.map((seat) => ({
                  id: `${seat.row}${seat.number}`,
                  backendId: seat.id,
                  row: seat.row,
                  number: seat.number,
                  tier: seat.tier,
                  price: Number(seat.price),
                  status: seat.status,
                }))
              );
            })
            .catch((error) => {
              console.error(
                'Failed to refresh seats after hold expiry:',
                error
              );
              showToast(
                'Your seat lock expired. Refresh seat availability.',
                'error'
              );
            });
        } else {
          // Demo show: use mock seating.
          setCurrentSeats(
            generateShowSeating(
              selectedShow.id,
              selectedShow.pricing
            )
          );
        }
      }

      showToast(
        'Your 10-minute seat lock expired. Seats returned to inventory.',
        'error'
      );
    }
  };

  tick();

  const interval = window.setInterval(tick, 1000);

  const handleSync = () => {
    tick();
  };

  window.addEventListener('focus', handleSync);
  document.addEventListener('visibilitychange', handleSync);

  return () => {
    clearInterval(interval);
    window.removeEventListener('focus', handleSync);
    document.removeEventListener('visibilitychange', handleSync);
  };
}, [isHoldActive, holdExpiryTimestamp, selectedShow]);


  // Toggle seat selection with automatic session storage sync

const toggleSeatSelection = async (seat: Seat) => {
  const isSelected = selectedSeatIds.includes(seat.id);

  // Never allow selecting a booked seat or another user's held seat.
  if (seat.status === 'booked') return;
  if (seat.status === 'held' && !isSelected) return;

  if (!isSelected && selectedSeatIds.length >= 8) {
    showToast(
      'Fair-usage policy: Maximum 8 seats per booking session.',
      'error'
    );
    return;
  }

  const isDatabaseShow =
    !!selectedShow && /^\d+$/.test(selectedShow.id);

  console.log('Seat booking diagnostic:', {
    movie: selectedMovie?.title,
    showId: selectedShow?.id,
    isDatabaseShow,
    seatId: seat.id,
    backendSeatId: seat.backendId,
  });

  const now = Date.now();
  const existingExpiry =
    isHoldActive && holdExpiryTimestamp && holdExpiryTimestamp > now
      ? holdExpiryTimestamp
      : now + HOLD_DURATION_SECONDS * 1000;

  try {
    let updated: string[];
    let expiry = existingExpiry;

    if (isSelected) {
      updated = selectedSeatIds.filter((id) => id !== seat.id);

      // Release this seat in Django.
      if (isDatabaseShow && seat.backendId !== undefined) {
        if (!holdToken) {
          showToast(
            'Your seat hold has expired or is unavailable. Please refresh the seats.',
            'error'
          );
          return;
        }

        await releaseSeatHold(
          Number(selectedShow!.id),
          holdToken,
          [seat.backendId]
        );
      }

      setSelectedSeatIds(updated);
      showToast(`Seat ${seat.id} released`, 'info');

      if (updated.length === 0) {
        setIsHoldActive(false);
        setHoldExpiryTimestamp(null);
        setHoldSecondsLeft(0);
        setHoldToken(null);

        try {
          sessionStorage.removeItem(SESSION_STORAGE_HOLD_KEY);
        } catch {
          // Ignore session storage errors.
        }
      } else {
        setIsHoldActive(true);
        setHoldExpiryTimestamp(expiry);
        setHoldSecondsLeft(
          Math.max(0, Math.floor((expiry - now) / 1000))
        );
        persistHoldToSession(updated, expiry);
      }

      return;
    }

    updated = [...selectedSeatIds, seat.id];

    // Create or extend the real database hold.
    if (isDatabaseShow) {
      if (seat.backendId === undefined) {
        showToast('This seat has no database ID. Please reload the seats.', 'error');
        return;
      }

      const backendSeatIds = currentSeats
        .filter(
          (currentSeat) =>
            updated.includes(currentSeat.id) &&
            currentSeat.backendId !== undefined
        )
        .map((currentSeat) => currentSeat.backendId!);

      if (backendSeatIds.length !== updated.length) {
        showToast('Some selected seats could not be identified. Please reload the seats.', 'error');
        return;
      }

      const result = await createSeatHold(
        Number(selectedShow!.id),
        backendSeatIds,
        holdToken ?? undefined
      );

      setHoldToken(result.hold_token);
      expiry = new Date(result.expires_at).getTime();
    }

    setSelectedSeatIds(updated);
    setIsHoldActive(true);
    setHoldExpiryTimestamp(expiry);
    setHoldSecondsLeft(
      Math.max(0, Math.floor((expiry - Date.now()) / 1000))
    );

    persistHoldToSession(updated, expiry);

    showToast(
      `Seat ${seat.id} (${seat.tier.toUpperCase()}) held for 10 minutes`,
      'success'
    );
  } catch (error) {
    console.error('Seat hold operation failed:', error);

    showToast(
      error instanceof Error
        ? error.message
        : 'Unable to update your seat hold. Please try again.',
      'error'
    );
  }
};


  const releaseHold = async () => {
  const activeShowId = selectedShow?.id;
  const activeToken = holdToken;

  const backendSeatIds = currentSeats
    .filter(
      (seat) =>
        selectedSeatIds.includes(seat.id) &&
        seat.backendId !== undefined
    )
    .map((seat) => seat.backendId!);

  // Clear the local state immediately.
  setSelectedSeatIds([]);
  setIsHoldActive(false);
  setHoldExpiryTimestamp(null);
  setHoldSecondsLeft(0);
  setHoldToken(null);

  try {
    sessionStorage.removeItem(SESSION_STORAGE_HOLD_KEY);
  } catch {
    // Ignore session storage errors.
  }

  // Release the real Django hold when this is a database-backed show.
  if (
    activeShowId &&
    /^\d+$/.test(activeShowId) &&
    activeToken &&
    backendSeatIds.length > 0
  ) {
    try {
      await releaseSeatHold(
        Number(activeShowId),
        activeToken,
        backendSeatIds
      );
    } catch (error) {
      console.error('Failed to release backend seat hold:', error);
      showToast(
        'Could not confirm seat release with the server. Refresh availability before booking again.',
        'error'
      );
    }
  }

  // Refresh inventory so the UI reflects the server.
  if (activeShowId && /^\d+$/.test(activeShowId)) {
    try {
      const apiSeats = await fetchSeats(Number(activeShowId));

      setCurrentSeats(
        apiSeats.map((seat) => ({
          id: `${seat.row}${seat.number}`,
          backendId: seat.id,
          row: seat.row,
          number: seat.number,
          tier: seat.tier,
          price: Number(seat.price),
          status: seat.status,
        }))
      );
    } catch (error) {
      console.error('Failed to refresh seat availability:', error);
    }
  }
};

  // Concessions
  const updateConcessionQty = (itemId: string, delta: number) => {
    setConcessionsCart((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      const copy = { ...prev };
      if (next === 0) {
        delete copy[itemId];
      } else {
        copy[itemId] = next;
      }
      if (isHoldActive && holdExpiryTimestamp && selectedSeatIds.length > 0) {
        persistHoldToSession(selectedSeatIds, holdExpiryTimestamp, undefined, copy);
      }
      return copy;
    });
  };

  const clearConcessions = () => {
    setConcessionsCart({});
    if (isHoldActive && holdExpiryTimestamp && selectedSeatIds.length > 0) {
      persistHoldToSession(selectedSeatIds, holdExpiryTimestamp, undefined, {});
    }
  };

  // Cost calculations
  const selectedSeats = currentSeats.filter((s) => selectedSeatIds.includes(s.id));
  const subtotalTickets = selectedSeats.reduce((acc, s) => acc + s.price, 0);

  const subtotalConcessions = Object.entries(concessionsCart).reduce((acc, [itemId, qty]) => {
    const item = CONCESSIONS.find((c: ConcessionItem) => c.id === itemId);
    return acc + (item ? item.price * qty : 0);
  }, 0);

  const convenienceFee = selectedSeatIds.length > 0 ? selectedSeatIds.length * 34 : 0;
  const taxes = Math.round((subtotalTickets + subtotalConcessions + convenienceFee) * 0.18);
  const grandTotal = subtotalTickets + subtotalConcessions + convenienceFee + taxes;

  // Start booking flow

  // Start booking flow

const startSeatBooking = (
  movie: Movie,
  theatre?: Theatre,
  show?: Show
) => {
  const chosenTheatre = theatre || THEATRES[0];

  console.log("startSeatBooking called:", {
    movie: movie.title,
    showId: show?.id,
  });

  // Preserve the supplied Django show; use mock data only for demo flows.
  const chosenShow =
    show ||
    getShowsForMovieAndTheatre(
      movie.id,
      chosenTheatre.id,
      selectedDate
    )[0];

  console.log("chosenShow:", chosenShow);

  // Release the previous hold if switching to another show.
  if (
    selectedShow &&
    chosenShow &&
    selectedShow.id !== chosenShow.id &&
    isHoldActive
  ) {
    releaseHold();
  }

  setSelectedMovie(movie);
  setSelectedTheatre(chosenTheatre);
  setSelectedShow(chosenShow || null);
  setIsMovieDetailOpen(false);
  handleSetCurrentView("seats");
};

  const proceedToConcessions = () => {
    if (selectedSeatIds.length === 0) return;
    handleSetCurrentView('concessions');
  };

  const proceedToPayment = () => {
    handleSetCurrentView('payment');
  };

  const returnToBrowse = () => {
    releaseHold();
    clearConcessions();
    handleSetCurrentView('browse');
  };

  const completeBooking = (customer: { name: string; phone: string; email: string; paymentMethod: string }) => {
    const concessionsList = Object.entries(concessionsCart)
      .map(([id, qty]) => ({
        item: CONCESSIONS.find((c: ConcessionItem) => c.id === id)!,
        quantity: qty,
      }))
      .filter((c) => Boolean(c.item));

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const randomHash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const pass: BookingPass = {
      bookingId: `CMP-${randomSuffix}-${Math.floor(1000 + Math.random() * 9000)}`,
      referenceHash: `SHA256-${randomHash}${Date.now().toString(16)}`,
      movie: selectedMovie!,
      theatre: selectedTheatre!,
      show: selectedShow!,
      seats: selectedSeats,
      concessions: concessionsList,
      subtotalTickets,
      subtotalConcessions,
      convenienceFee,
      taxes,
      totalPaid: grandTotal,
      bookedAt: new Date().toISOString(),
      paymentMethod: customer.paymentMethod,
      paymentId: `pay_${Math.random().toString(36).substring(2, 12)}`,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
    };

    const updatedPasses = [pass, ...myPasses];
    savePasses(updatedPasses);
    setActivePass(pass);
    setIsHoldActive(false);
    setHoldExpiryTimestamp(null);
    setHoldSecondsLeft(0);
    setSelectedSeatIds([]);
    clearConcessions();
    sessionStorage.removeItem(SESSION_STORAGE_HOLD_KEY);
    showToast(`Pass confirmed for ${pass.movie.title}! Tickets issued.`, 'success');
    setCurrentView('ticket-pass');
    return pass;
  };

  const cancelBookingPass = (bookingId: string) => {
    const updated = myPasses.filter((p) => p.bookingId !== bookingId);
    savePasses(updated);
    if (activePass?.bookingId === bookingId) {
      setActivePass(null);
    }
    showToast(`Booking ${bookingId} cancelled. 100% refund initiated to source.`, 'info');
  };

  return (
    <BookingContext.Provider
      value={{
        currentView,
        setCurrentView: handleSetCurrentView,
        user,
        setUser,
        selectedCity,
        setSelectedCity,
        isCityModalOpen,
        setIsCityModalOpen,
        toast,
        showToast,
        dismissToast,
        selectedMovie,
        setSelectedMovie,
        isMovieDetailOpen,
        setIsMovieDetailOpen,
        selectedDate,
        setSelectedDate,
        selectedTheatre,
        setSelectedTheatre,
        selectedShow,
        setSelectedShow,
        currentSeats,
        selectedSeatIds,
        toggleSeatSelection,
        holdSecondsLeft,
        isHoldActive,
        holdToken,
        releaseHold,
        concessionsCart,
        updateConcessionQty,
        clearConcessions,
        subtotalTickets,
        subtotalConcessions,
        convenienceFee,
        taxes,
        grandTotal,
        activePass,
        setActivePass,
        myPasses,
        refreshMyPasses,
        activateConfirmedPass,
        completeBooking,
        cancelBookingPass,
        startSeatBooking,
        proceedToConcessions,
        proceedToPayment,
        returnToBrowse,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export const useBookingStore = useBooking;
