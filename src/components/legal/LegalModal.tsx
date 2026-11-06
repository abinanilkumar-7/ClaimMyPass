import React from 'react';
import { X, ShieldCheck, FileText, RefreshCw, Cookie, Building2, Phone, Mail, HelpCircle } from 'lucide-react';

export type LegalTab = 'privacy' | 'terms' | 'refund' | 'cookies' | 'partners' | 'support';

interface LegalModalProps {
  activeTab: LegalTab | null;
  onClose: () => void;
  onSelectTab: (tab: LegalTab) => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  activeTab,
  onClose,
  onSelectTab,
}) => {
  if (!activeTab) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#080E09] border border-[#7FA35C]/40 rounded-2xl shadow-2xl p-6 sm:p-8 text-zinc-100 max-h-[88vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-[#FFD900] tracking-tight">ClaimMyPass</span>
            <span className="text-zinc-600">·</span>
            <span className="text-xs font-mono uppercase text-[#7FA35C]">Policy & Information Center</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-white/5 text-xs shrink-0">
          <button
            onClick={() => onSelectTab('privacy')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[#101511] text-[#FFD900] border border-[#FFD900] font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => onSelectTab('terms')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-[#101511] text-[#FFD900] border border-[#FFD900] font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Admission</span>
          </button>

          <button
            onClick={() => onSelectTab('refund')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'refund'
                ? 'bg-[#101511] text-[#FFD900] border border-[#FFD900] font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refund Policy</span>
          </button>

          <button
            onClick={() => onSelectTab('cookies')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cookies'
                ? 'bg-[#101511] text-[#FFD900] border border-[#FFD900] font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Cookie Policy</span>
          </button>

          <button
            onClick={() => onSelectTab('partners')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'partners'
                ? 'bg-[#101511] text-[#FFD900] border border-[#FFD900] font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Multiplex Partners</span>
          </button>

          <button
            onClick={() => onSelectTab('support')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'support'
                ? 'bg-[#101511] text-[#FFD900] border border-[#FFD900] font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Contact Support</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed pr-1 flex-1">
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white">Privacy Policy</h4>
              <p className="text-zinc-400 text-xs">
                Last updated: October 2026. Effective for all ClaimMyPass ticket reservations.
              </p>
              <div className="space-y-3">
                <h5 className="font-semibold text-zinc-100">1. Data Minimization Principle</h5>
                <p>
                  ClaimMyPass strictly collects only the essential contact information necessary to dispatch your digital tickets: your Full Name, Mobile Number (for instant SMS pass token delivery), and Email Address (for cryptographic PDF pass dispatch). We do not collect unnecessary tracking profiles or share your personal details with third-party advertising brokers.
                </p>

                <h5 className="font-semibold text-zinc-100">2. Storage and Encryption</h5>
                <p>
                  All transaction payloads and digital booking references are cryptographically signed using SHA-256 signatures. Seat hold tokens stored in your browser session expire automatically after 10 minutes.
                </p>

                <h5 className="font-semibold text-zinc-100">3. Multiplex Admission Verification</h5>
                <p>
                  At turnstile entry, only the signed booking hash and seat numbers are verified against the cinema server. Your private payment card numbers never touch cinema turnstiles.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white">Terms of Admission & Ticketing Conditions</h4>
              <p className="text-zinc-400 text-xs">
                Applicable across all participating multiplex auditoriums.
              </p>
              <div className="space-y-3">
                <h5 className="font-semibold text-zinc-100">1. Seat Inventory Holds</h5>
                <p>
                  Selecting seats initiates a 10-minute temporary inventory lock. If payment verification is not completed within 600 seconds, held seats are automatically released back to the general public inventory.
                </p>

                <h5 className="font-semibold text-zinc-100">2. Age Certification & Identification</h5>
                <p>
                  Films rated 'A' (Adults Only) require government-issued photo ID at entry. Cinema staff reserve the right to refuse admission to minors for certified adult screenings without entitlement to a refund.
                </p>

                <h5 className="font-semibold text-zinc-100">3. Digital Pass Presentation</h5>
                <p>
                  Patrons may display either the high-contrast dynamic QR code on their smartphone screen or a printed paper ticket pass at turnstiles.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white">Cancellation & Refund Policy</h4>
              <p className="text-zinc-400 text-xs">
                Clear, fair, and transparent cancellation guidelines.
              </p>
              <div className="space-y-3">
                <h5 className="font-semibold text-zinc-100">1. Cancellation Window</h5>
                <p>
                  Tickets booked through ClaimMyPass can be cancelled up to 2 hours before the scheduled showtime. Cancellations made within the eligible window receive an immediate 100% refund of the ticket face value back to the original payment source or instant ClaimMyPass wallet credit.
                </p>

                <h5 className="font-semibold text-zinc-100">2. Food & Beverage Pre-Orders</h5>
                <p>
                  Pre-ordered concessions cancelled at least 2 hours before showtime are fully refundable. Concessions prepared on-site after the 2-hour cutoff cannot be refunded.
                </p>

                <h5 className="font-semibold text-zinc-100">3. Show Cancellation by Multiplex</h5>
                <p>
                  In the event of technical failure, projector malfunction, or cancellation by the cinema chain, patrons receive an automatic 100% full refund including all convenience fees within 24 to 48 hours.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white">Cookie & Local Storage Policy</h4>
              <p className="text-zinc-400 text-xs">
                Understanding how ClaimMyPass manages session persistence.
              </p>
              <div className="space-y-3">
                <h5 className="font-semibold text-zinc-100">1. Essential Session Cookies</h5>
                <p>
                  We use secure session storage strictly to maintain your active 10-minute seat hold timer across page reloads and to remember your selected metropolitan city. These are strictly necessary for the ticketing checkout process.
                </p>

                <h5 className="font-semibold text-zinc-100">2. Local Storage for Passes</h5>
                <p>
                  Your confirmed ticket passes are cached locally in your browser's private local storage so that you can view your QR codes offline even in basement cinema parking lots with limited cell reception.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'partners' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white">Multiplex Exhibition Partners</h4>
              <p className="text-zinc-400 text-xs">
                Direct integration with premier cinema chains across major metros.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-[#101511] border border-white/5">
                  <h6 className="font-bold text-white">PVR INOX Limited</h6>
                  <p className="text-xs text-zinc-400 mt-1">
                    Director's Cut, IMAX with Laser, 4DX, and Gold Class auditoriums nationwide.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#101511] border border-white/5">
                  <h6 className="font-bold text-white">Cinépolis India</h6>
                  <p className="text-xs text-zinc-400 mt-1">
                    Dolby Cinema 4K, Macro XE large format screens, and VIP Loungers.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#101511] border border-white/5">
                  <h6 className="font-bold text-white">IMAX Corporation</h6>
                  <p className="text-xs text-zinc-400 mt-1">
                    Next-generation dual 4K laser projection with 12-channel immersive sound.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#101511] border border-white/5">
                  <h6 className="font-bold text-white">Dolby Laboratories</h6>
                  <p className="text-xs text-zinc-400 mt-1">
                    Dolby Atmos 64-channel spatial sound and Dolby Vision HDR mastering.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white">ClaimMyPass Concierge & Support</h4>
              <p className="text-zinc-400 text-xs">
                Our support team is available 7 days a week from 8:00 AM to 12:00 AM Midnight.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#101511] border border-[#7FA35C]/30">
                  <div className="p-2.5 rounded-lg bg-[#080E09] text-[#FFD900] border border-[#FFD900]/30 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Toll-Free Phone Concierge</span>
                    <a
                      href="tel:+917418987607"
                      className="font-mono text-sm font-bold text-[#FFD900] hover:text-[#FFFC72] underline transition-colors"
                    >
                      +91 741 898 7607
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#101511] border border-[#7FA35C]/30">
                  <div className="p-2.5 rounded-lg bg-[#080E09] text-[#648E37] border border-[#648E37]/30 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Direct Ticket Inquiries & Escalations</span>
                    <a
                      href="mailto:abinanilkumar26@gmail.com"
                      className="font-mono text-sm font-bold text-[#648E37] hover:text-[#7FA35C] underline transition-colors"
                    >
                      support@claimmypass.com
                    </a>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 pt-2">
                  Have your 8-digit Booking ID (e.g., CMP-7829-4102) ready for accelerated turnaround.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-bold bg-[#FFD900] text-[#080E09] hover:bg-[#FFFC72] transition-colors cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
