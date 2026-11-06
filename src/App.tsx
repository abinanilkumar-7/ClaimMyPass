import React, { useEffect, useState, Suspense } from 'react';
import { BookingProvider, useBooking } from './context/BookingContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroShowcase } from './components/movies/HeroShowcase';
import { SignInPage } from './components/auth/SignInPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { MovieCard } from './components/movies/MovieCard';
import { MovieFilterBar } from './components/movies/MovieFilterBar';
import { MovieDetailModal } from './components/movies/MovieDetailModal';
import { TheatresList } from './components/theatres/TheatresList';
import { SeatGrid } from './components/seats/SeatGrid';
import { HoldCountdownBanner } from './components/checkout/HoldCountdownBanner';
import { ConcessionSelector } from './components/checkout/ConcessionSelector';
import { PaymentModal } from './components/checkout/PaymentModal';
import { DigitalPassModal } from './components/tickets/DigitalPassModal';
import { MyPassesView } from './components/passes/MyPassesView';
import { CityModal } from './components/city/CityModal';
import { LegalModal, LegalTab } from './components/legal/LegalModal';
import { CookieConsentBanner } from './components/legal/CookieConsentBanner';
import { Custom404View } from './components/common/Custom404View';
import { ToastContainer } from './components/common/ToastContainer';
import { MOVIES as FALLBACK_MOVIES } from './data/mockData';

import { Film } from 'lucide-react';
import { fetchMovies } from './services/movieApi';
const StaffScanner = React.lazy(() =>
  import("./components/staff/StaffScanner").then(
    ({ StaffScanner }) => ({
      default: StaffScanner,
    })
  )
);

const MainContent: React.FC = () => {
  const { currentView, selectedDate, setSelectedDate, setCurrentView, setUser, } = useBooking();
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [activeLegalTab, setActiveLegalTab] = useState<LegalTab | null>(null);

const [movies, setMovies] = useState(FALLBACK_MOVIES);
const [moviesLoading, setMoviesLoading] = useState(true);
const [moviesError, setMoviesError] = useState('');

useEffect(() => {
  const path = window.location.pathname;

  if (path === '/reset-password') {
    setCurrentView('reset-password');
  } else if (path === '/staff/scanner') {
    setCurrentView('staff-scanner');
  }
}, [setCurrentView]);

useEffect(() => {
  let cancelled = false;

  fetchMovies()
    .then((data) => {
      if (!cancelled) {
        setMovies(data);
        setMoviesError('');
      }
    })
    .catch((error: unknown) => {
      if (!cancelled) {
        setMoviesError(
          error instanceof Error
            ? error.message
            : 'Unable to load movies from the server.'
        );
      }
    })
    .finally(() => {
      if (!cancelled) setMoviesLoading(false);
    });

  return () => {
    cancelled = true;
  };
}, []);


  // Filter movies based on user selections
  const filteredMovies = movies.filter((movie) => {
    if (selectedGenre && !movie.genre.includes(selectedGenre)) return false;
    if (selectedFormat && !movie.formats.includes(selectedFormat)) return false;
    return true;
  });
  const featuredMovie = movies.find((movie) => movie.isFeatured) ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-[#101511] text-zinc-100 selection:bg-[#FFD900] selection:text-[#080E09] overflow-x-hidden">
      {/* 1. Header with mobile navigation and accessible brand click */}
      <Navbar onOpenLegalTab={(tab) => setActiveLegalTab(tab)} />

      {/* 2. Real-time Toast Notifications */}
      <ToastContainer />

      {/* 3. Floating 10-Minute Hold Urgency Banner */}
      <HoldCountdownBanner />

      {/* 4. Dynamic Router / View Switcher */}
      <main className="flex-1">
        {currentView === "staff-scanner" && (
  <Suspense
    fallback={
      <div className="min-h-screen bg-[#101511] flex items-center justify-center text-[#FFD900]">
        Loading staff scanner...
      </div>
    }
  >
    <StaffScanner
      onBack={() => {
        window.history.replaceState({}, "", "/");
        setCurrentView("browse");
      }}
    />
  </Suspense>
)}
        {currentView === 'browse' && (
          <div>
            {/* Cinematic Hero */}
            <HeroShowcase
              movie={featuredMovie}
              loading={moviesLoading}
              error={moviesError}
            />

            {/* Catalog Discovery Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#648E37] uppercase tracking-wider mb-1">
                    <Film className="w-4 h-4" />
                    <span>Theatrical Releases</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Now Showing on Big Screens
                  </h2>
                </div>

                <div className="text-xs text-zinc-400">
                  Showing <span className="font-bold text-[#FFD900] tabular-nums">{filteredMovies.length}</span> titles
                </div>
              </div>

              {/* Filters */}
              <MovieFilterBar
                selectedGenre={selectedGenre}
                setSelectedGenre={setSelectedGenre}
                selectedFormat={selectedFormat}
                setSelectedFormat={setSelectedFormat}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />

              {/* Movie Grid */}
              {filteredMovies.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-[#080E09] border border-[#7FA35C]/20 rounded-xl p-8">
                  <p className="text-sm text-zinc-300 font-semibold mb-2">No movies match the selected filters.</p>
                  <button
                    onClick={() => {
                      setSelectedGenre('');
                      setSelectedFormat('');
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-[#FFD900] text-[#080E09] cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              )}

              {/* Theatres in City */}
              <TheatresList />
            </section>
          </div>
        )}
        {currentView === 'sign-in' && (
  <SignInPage
    onSuccess={(authenticatedUser) => {
      setUser(authenticatedUser);
      setCurrentView(
        window.location.pathname === "/staff/scanner"
        ? "staff-scanner"
        : "browse"
      );
    }}
    onSwitchToSignUp={() => setCurrentView('sign-up')}
    onBack={() => setCurrentView('browse')}
    onForgotPassword={() => setCurrentView('forgot-password')}
  />
)}

{currentView === 'sign-up' && (
  <SignUpPage
    onSuccess={(authenticatedUser) => {
      setUser(authenticatedUser);
      setCurrentView('browse');
    }}
    onSwitchToSignIn={() => setCurrentView('sign-in')}
    onBack={() => setCurrentView('browse')}
  />
)}

{currentView === 'forgot-password' && (
  <ForgotPasswordPage
    onBack={() => setCurrentView('sign-in')}
  />
)}

{currentView === 'reset-password' && (
  <ResetPasswordPage
    onBackToSignIn={() => {
      window.history.replaceState({}, '', '/');
      setCurrentView('sign-in');
    }}
  />
)}

        {currentView === 'seats' && <SeatGrid />}

        {currentView === 'concessions' && <ConcessionSelector />}

        {currentView === 'payment' && <PaymentModal />}

        {currentView === 'ticket-pass' && <DigitalPassModal />}

        {currentView === 'my-passes' && <MyPassesView />}

        {currentView === '404' && (
          <Custom404View onBackToMovies={() => setCurrentView('browse')} />
        )}
      </main>

      {/* 5. Modals */}
      <CityModal />
      <MovieDetailModal />
      <LegalModal
        activeTab={activeLegalTab}
        onClose={() => setActiveLegalTab(null)}
        onSelectTab={(tab) => setActiveLegalTab(tab)}
      />

      {/* 6. Cookie Consent Banner */}
      <CookieConsentBanner onOpenCookiePolicy={() => setActiveLegalTab('cookies')} />

      {/* 7. Footer with Marshland Background and Functional Legal Links */}
      <Footer onOpenLegalTab={(tab) => setActiveLegalTab(tab)} />
    </div>
  );
};

export default function App() {
  return (
    <BookingProvider>
      <MainContent />
    </BookingProvider>
  );
}
