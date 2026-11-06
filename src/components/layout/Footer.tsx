import React from 'react';
import { ShieldCheck, Film, Clock, Award, Phone, Mail } from 'lucide-react';
import { LegalTab } from '../legal/LegalModal';

interface FooterProps {
  onOpenLegalTab: (tab: LegalTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegalTab }) => {
  return (
    <footer className="w-full bg-[#080E09] border-t border-[#7FA35C]/20 text-zinc-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Value Proposition Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-10 border-b border-white/5 text-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-[#101511] text-[#FFD900] border border-[#7FA35C]/30 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">10-Min Real-Time Hold</p>
              <p className="text-xs text-zinc-400 mt-1">
                Zero double-booking guarantee backed by distributed lock coordinator.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-[#101511] text-[#648E37] border border-[#7FA35C]/30 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">Encrypted Digital Passes</p>
              <p className="text-xs text-zinc-400 mt-1">
                Cryptographically signed tickets with high-density barcode verification.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-[#101511] text-[#FFFC72] border border-[#7FA35C]/30 shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">Certified Formats</p>
              <p className="text-xs text-zinc-400 mt-1">
                Curated IMAX with Laser, Dolby Cinema 4K, 4DX, and VIP Recliners.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-[#101511] text-[#7FA35C] border border-[#7FA35C]/30 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">Direct Multiplex Sync</p>
              <p className="text-xs text-zinc-400 mt-1">
                Direct integration with multiplex chains across 8 major metros.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Concierge Bar */}
        <div className="py-6 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">Direct Support:</span>
            <a
              href="tel:+917418987607"
              className="flex items-center gap-1.5 text-zinc-300 hover:text-[#FFD900] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#648E37]" />
              <span>+91 741 898 7607</span>
            </a>
            <a
              href="mailto:abinanilkumar321@gmail.com"
              className="flex items-center gap-1.5 text-zinc-300 hover:text-[#FFFC72] transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-[#648E37]" />
              <span>support@claimmypass.com</span>
            </a>
          </div>

          <div className="text-[11px] text-zinc-500">
            Assistance available daily: 8:00 AM - 12:00 AM Midnight
          </div>
        </div>

        {/* Bottom Bar with Functional Legal Links */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#FFD900]">ClaimMyPass</span>
            <span className="text-zinc-600">·</span>
            <span>&copy; 2026 ClaimMyPass Ticketing Technologies. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-zinc-400">
            <button
              onClick={() => onOpenLegalTab('privacy')}
              className="hover:text-zinc-100 cursor-pointer transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onOpenLegalTab('terms')}
              className="hover:text-zinc-100 cursor-pointer transition-colors"
            >
              Terms of Admission
            </button>
            <button
              onClick={() => onOpenLegalTab('refund')}
              className="hover:text-zinc-100 cursor-pointer transition-colors"
            >
              Refund Policy
            </button>
            <button
              onClick={() => onOpenLegalTab('cookies')}
              className="hover:text-zinc-100 cursor-pointer transition-colors"
            >
              Cookie Policy
            </button>
            <button
              onClick={() => onOpenLegalTab('partners')}
              className="hover:text-zinc-100 cursor-pointer transition-colors"
            >
              Multiplex Partners
            </button>
            <button
              onClick={() => onOpenLegalTab('support')}
              className="hover:text-zinc-100 cursor-pointer transition-colors"
            >
              Support
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
