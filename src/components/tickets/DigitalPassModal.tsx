import React, { useRef, useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { BookingPass } from '../../types';
import html2canvas from "@html2canvas/html2canvas";
import { jsPDF } from "jspdf";
import {
  CheckCircle2,
  Download,
  Printer,
  Calendar,
  Clock,
  MapPin,
  Film,
  Sparkles,
  Share2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { TicketQRCode } from './TicketQRCode';
import { SocialPreviewModal } from './SocialPreviewModal';

interface DigitalPassProps {
  passOverride?: BookingPass;
  onClose?: () => void;
}

export const DigitalPassModal: React.FC<DigitalPassProps> = ({ passOverride, onClose }) => {
  const { activePass, returnToBrowse, setCurrentView } = useBooking();
  const pass = passOverride || activePass;
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!pass) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPass = async () => {
  const ticketElement = ticketRef.current;

  if (!ticketElement || isDownloading) return;

  try {
    setIsDownloading(true);

    // Wait for fonts to finish loading before capturing the ticket.
    await document.fonts.ready;

    // Capture only the ticket, not the entire application.
    const canvas = await html2canvas(ticketElement, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#080E09",
      logging: false,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("The ticket could not be rendered.");
    }

    // Create an A4 PDF.
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 12;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    // Preserve the ticket's original aspect ratio.
    let renderWidth = maxWidth;
    let renderHeight = (canvas.height * renderWidth) / canvas.width;

    // Scale down when the ticket is taller than the printable area.
    if (renderHeight > maxHeight) {
      renderHeight = maxHeight;
      renderWidth = (canvas.width * renderHeight) / canvas.height;
    }

    // Center the ticket on the PDF page.
    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    const imageData = canvas.toDataURL("image/png");

    pdf.addImage(
      imageData,
      "PNG",
      x,
      y,
      renderWidth,
      renderHeight,
      undefined,
      "FAST"
    );

    const safeBookingId = String(pass.bookingId).replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );

    pdf.save(`ClaimMyPass_${safeBookingId}.pdf`);
  } catch (error) {
    console.error("Ticket PDF generation failed:", error);

    window.alert(
      "Unable to download the ticket PDF. Please try again."
    );
  } finally {
    setIsDownloading(false);
  }
};

  return (
    <div className="w-full min-h-screen bg-[#101511] py-12 px-4 sm:px-6 lg:px-8 text-zinc-100 flex flex-col items-center">
      {/* Success Notification */}
      <div className="w-full max-w-xl text-center mb-6 space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#648E37]/20 border border-[#648E37] text-[#FFD900] mb-2 animate-in zoom-in-50">
          <CheckCircle2 className="w-8 h-8 text-[#FFD900]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Your Cinema Pass is Claimed!
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Admission guaranteed. We have sent the confirmation & QR code to{' '}
          <span className="text-[#FFFC72]">{pass.customerEmail}</span>
        </p>
      </div>

      {/* Ticket Container */}
      <div
        ref={ticketRef}
        className="ticket-print-root relative w-full max-w-xl bg-[#080E09] border border-[#7FA35C]/40 rounded-2xl shadow-2xl overflow-hidden print:border-black print:text-black print:bg-white"
      >
        {/* Ticket Header Banner */}
        <div className="p-6 bg-gradient-to-r from-[#101511] to-[#080E09] border-b border-[#7FA35C]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-[#FFD900] tracking-tight">ClaimMyPass</span>
            <span className="text-[10px] font-mono text-[#648E37] px-2 py-0.5 rounded bg-[#101511] border border-[#648E37]/40 uppercase">
              Confirmed Pass
            </span>
          </div>

          <div className="text-right text-[11px] font-mono text-zinc-400">
            <span className="block text-zinc-500">BOOKING ID</span>
            <span className="text-[#FFFC72] font-bold">{pass.bookingId}</span>
          </div>
        </div>

        {/* Movie Info Section */}
        <div className="p-6 grid grid-cols-12 gap-4">
          <div className="col-span-3">
            <div className="aspect-[3/4] rounded-lg overflow-hidden border border-white/10 bg-[#101511]">
              <img
                src={pass.movie.posterUrl}
                alt={pass.movie.title}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                width="120"
                height="160"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="col-span-9 space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-[#7FA35C] font-semibold">
              <span>{pass.show.format}</span>
              <span>·</span>
              <span>{pass.movie.certification}</span>
            </div>

            <h2 className="text-xl font-extrabold text-white leading-tight">
              {pass.movie.title}
            </h2>

            <p className="text-xs text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#648E37] shrink-0" />
              <span>{pass.theatre.name}</span>
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
              <div className="bg-[#101511] px-2.5 py-1 rounded border border-white/5">
                <span className="text-zinc-500 block text-[9px]">DATE</span>
                <span className="text-[#FFFC72] font-bold">{pass.show.date}</span>
              </div>
              <div className="bg-[#101511] px-2.5 py-1 rounded border border-white/5">
                <span className="text-zinc-500 block text-[9px]">TIME</span>
                <span className="text-[#FFD900] font-bold">{pass.show.time}</span>
              </div>
              <div className="bg-[#101511] px-2.5 py-1 rounded border border-white/5">
                <span className="text-zinc-500 block text-[9px]">SCREEN</span>
                <span className="text-zinc-200">{pass.show.screenName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Perforated Tear Line with Notches */}
        <div className="relative py-2 flex items-center justify-between">
          <div className="w-4 h-8 bg-[#101511] rounded-r-full border-r border-[#7FA35C]/40 -ml-0.5" />
          <div className="flex-1 border-b-2 border-dashed border-[#7FA35C]/30 mx-2" />
          <div className="w-4 h-8 bg-[#101511] rounded-l-full border-l border-[#7FA35C]/40 -mr-0.5" />
        </div>

        {/* Seats & QR Section */}
        <div className="p-6 pt-3 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          {/* Seats & Info */}
          <div className="sm:col-span-7 space-y-3">
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                Allocated Seats ({pass.seats.length})
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {pass.seats.map((seat) => (
                  <span
                    key={seat.id}
                    className="px-2.5 py-1 rounded bg-[#FFD900] text-[#080E09] font-mono font-black text-sm shadow-sm"
                  >
                    {seat.id}
                  </span>
                ))}
              </div>
            </div>

            {pass.concessions.length > 0 && (
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                  Food & Beverages (Pre-Ordered)
                </span>
                <div className="text-xs text-zinc-300 mt-0.5 space-y-0.5">
                  {pass.concessions.map((c, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{c.item.name}</span>
                      <span className="text-zinc-400">× {c.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/5 flex justify-between text-xs">
              <span className="text-zinc-400">Total Paid:</span>
              <span className="text-sm font-bold text-[#FFFC72] font-mono tabular-nums">
                ₹{pass.totalPaid}
              </span>
            </div>

            <div className="text-[10px] text-zinc-500 font-mono break-all">
              REF: {pass.referenceHash}
            </div>
          </div>

          {/* Dynamic Branded Ticket QR Code */}
          <div className="sm:col-span-5 flex flex-col items-center justify-center">
            <TicketQRCode
              token={pass.qrToken}
              bookingId={pass.bookingId}
              size={140}
              showBranding={true}
            />
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-[#101511] px-6 py-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5 text-[#648E37]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Server Signed Ticket
          </span>
          <span>ClaimMyPass Ticketing</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-xl mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#080E09] text-zinc-200 border border-[#7FA35C]/40 hover:border-[#FFD900] hover:text-white transition-colors cursor-pointer"
            aria-label="Share ticket or generate social preview card"
          >
            <Share2 className="w-3.5 h-3.5 text-[#FFD900]" />
            <span>Share</span>
          </button>

          <button
            onClick={handleDownloadPass}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#080E09] text-zinc-200 border border-[#7FA35C]/40 hover:border-[#FFD900] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#FFD900]" />
            <span>Download Pass</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#080E09] text-zinc-200 border border-[#7FA35C]/40 hover:border-[#FFD900] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#648E37]" />
            <span>Print Pass</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onClose ? (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-xs font-bold bg-[#FFD900] text-[#080E09] hover:bg-[#FFFC72] transition-colors cursor-pointer"
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={() => setCurrentView('my-passes')}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Go to My Passes
              </button>
              <button
                onClick={returnToBrowse}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold bg-[#FFD900] text-[#080E09] hover:bg-[#FFFC72] shadow-glow-yellow transition-all cursor-pointer"
              >
                <span>Book Another Movie</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Social Media Preview & Sharing Modal */}
      <SocialPreviewModal
        pass={pass}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};
