import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { logout } from '../../services/authApi';
import {
  MapPin,
  Ticket,
  ChevronDown,
  Menu,
  X,
  Film,
  UserRound,
  LogIn,
  LogOut,
  UserPlus,
} from 'lucide-react';

interface NavbarProps {
  onOpenLegalTab?: (tab: 'privacy' | 'terms' | 'refund' | 'support') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLegalTab }) => {
  const {
    currentView,
    setCurrentView,
    selectedCity,
    setIsCityModalOpen,
    myPasses,
    returnToBrowse,
    user,
    setUser,
  } = useBooking();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogoClick = () => {
    returnToBrowse();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (view: 'browse' | 'my-passes', targetElementId?: string) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    if (targetElementId) {
      setTimeout(() => {
        const el = document.getElementById(targetElementId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const openAuthPage = (view: 'sign-in' | 'sign-up') => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error){
      console.error('Logout Request Failed:', error);
    } finally{
      setUser(null);
      returnToBrowse();
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080E09]/95 backdrop-blur-md border-b border-[#7FA35C]/20 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single text element wordmark (Clickable to home) */}
        <button
          onClick={handleLogoClick}
          className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FFD900] hover:text-[#FFFC72] transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
          aria-label="ClaimMyPass Home"
        >
          <span>ClaimMyPass</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#648E37]" />
        </button>

        {/* Zone 2: 4-5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-300">
          <button
            onClick={() => handleNavClick('browse')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentView === 'browse'
                ? 'text-[#FFD900] font-semibold border-b-2 border-[#FFD900] pb-0.5'
                : 'hover:text-white'
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => handleNavClick('browse', 'theatres-section')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Theatres
          </button>
          <button
            onClick={() => handleNavClick('my-passes')}
            className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              currentView === 'my-passes'
                ? 'text-[#FFD900] font-semibold border-b-2 border-[#FFD900] pb-0.5'
                : 'hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4 text-[#648E37]" />
            <span>My Passes</span>
            {myPasses.length > 0 && (
              <span className="text-[11px] font-bold text-[#080E09] bg-[#FFD900] px-1.5 py-0.2 rounded-full tabular-nums">
                {myPasses.length}
              </span>
            )}
          </button>
          <span className="text-zinc-600 text-xs hidden lg:inline">·</span>
          <span className="text-xs text-[#7FA35C] font-mono hidden lg:inline">
            10-MIN INVENTORY LOCK ACTIVE
          </span>
        </nav>

        {/* Authentication actions — desktop */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <span className="flex items-center gap-1.5 text-sm text-zinc-300">
                <UserRound className="h-4 w-4 text-[#648E37]" />
                <span className="max-w-28 truncate">{user.name}</span>
              </span>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-md border border-[#7FA35C]/40 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-[#FFD900] hover:text-[#FFD900] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuthPage('sign-in')}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-[#FFD900] transition-colors"
              >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
              </button>
              <button
              onClick={() => openAuthPage('sign-up')}
              className="flex items-center gap-1.5 rounded-md bg-[#FFD900] px-3 py-2 text-xs font-bold text-[#080E09] hover:bg-[#FFFC72] transition-colors"
              >
              <UserPlus className="h-3.5 w-3.5" />
              Create Account
            </button>
            </>
          )}
        </div>

        {/* Zone 3: 1 primary action & Mobile Menu toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsCityModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold bg-[#101511] text-[#FFFC72] border border-[#7FA35C]/40 hover:border-[#FFD900] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label={`Change metropolitan city, currently ${selectedCity.name}`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#648E37]" />
            <span>{selectedCity.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-md bg-[#101511] text-zinc-200 border border-[#7FA35C]/30 hover:border-[#FFD900] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-[#FFD900]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#080E09] border-b border-[#7FA35C]/30 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-2 text-sm font-medium">
            <div className="mb-2 rounded-lg border border-[#7FA35C]/20 bg-[#101511] p-3">
  {user ? (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <UserRound className="h-5 w-5 shrink-0 text-[#FFD900]" />
        <span className="truncate text-sm font-semibold text-white">
          {user.name}
        </span>
      </div>

      <button
        onClick={handleLogout}
        className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:text-[#FFD900]"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign Out
      </button>
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => openAuthPage('sign-in')}
        className="flex items-center justify-center gap-1.5 rounded-md border border-[#7FA35C]/40 px-2 py-2 text-sm text-white"
      >
        <LogIn className="h-4 w-4" />
        Sign In
      </button>

      <button
        onClick={() => openAuthPage('sign-up')}
        className="flex items-center justify-center gap-1.5 rounded-md bg-[#FFD900] px-2 py-2 text-sm font-bold text-[#080E09]"
      >
        <UserPlus className="h-4 w-4" />
        Sign Up
      </button>
    </div>
  )}
</div>
            <button
              onClick={() => handleNavClick('browse')}
              className={`flex items-center justify-between p-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                currentView === 'browse'
                  ? 'bg-[#101511] text-[#FFD900] font-bold border border-[#FFD900]/40'
                  : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Film className="w-4 h-4 text-[#648E37]" />
                <span>Now Showing Movies</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('browse', 'theatres-section')}
              className="flex items-center gap-2.5 p-2.5 rounded-lg text-left text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[#648E37]" />
              <span>Cinemas & Theatres in {selectedCity.name}</span>
            </button>

            <button
              onClick={() => handleNavClick('my-passes')}
              className={`flex items-center justify-between p-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                currentView === 'my-passes'
                  ? 'bg-[#101511] text-[#FFD900] font-bold border border-[#FFD900]/40'
                  : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Ticket className="w-4 h-4 text-[#648E37]" />
                <span>My Booked Passes</span>
              </div>
              {myPasses.length > 0 && (
                <span className="text-xs font-bold text-[#080E09] bg-[#FFD900] px-2 py-0.5 rounded-full">
                  {myPasses.length}
                </span>
              )}
            </button>

            {onOpenLegalTab && (
              <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenLegalTab('support');
                  }}
                  className="p-2 rounded bg-[#101511] text-left hover:text-white cursor-pointer"
                >
                  Contact Support
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenLegalTab('refund');
                  }}
                  className="p-2 rounded bg-[#101511] text-left hover:text-white cursor-pointer"
                >
                  Refund Policy
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
