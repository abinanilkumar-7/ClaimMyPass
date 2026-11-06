import React, { useMemo } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck } from 'lucide-react';

interface TicketQRCodeProps {
  token?: string;
  bookingId: string;
  size?: number;
  className?: string;
  showBranding?: boolean;
}

export const TicketQRCode: React.FC<TicketQRCodeProps> = ({
  token,
  bookingId,
  size = 140,
  className = '',
  showBranding = true,
}) => {
  // Encode only the backend-generated signed token.
  const qrData = useMemo(() => {
    if (!token) return null;

    try {
      const qr = QRCode.create(token, {
        errorCorrectionLevel: 'M',
      });

      const moduleCount = qr.modules.size;
      const matrix: boolean[][] = [];

      for (let r = 0; r < moduleCount; r++) {
        const row: boolean[] = [];

        for (let c = 0; c < moduleCount; c++) {
          row.push(Boolean(qr.modules.get(r, c)));
        }

        matrix.push(row);
      }

      return { matrix, moduleCount };
    } catch (error) {
      console.error('Unable to generate ticket QR:', error);
      return null;
    }
  }, [token]);

  if (!qrData) {
    return (
      <div className="w-40 min-h-40 flex flex-col items-center justify-center gap-2 bg-white rounded-xl p-4 text-center">
        <ShieldCheck className="w-7 h-7 text-zinc-400" />

        <span className="text-xs font-semibold text-zinc-600">
          Secure QR unavailable
        </span>

        <span className="text-[10px] text-zinc-400">
          Refresh your confirmed pass to retrieve its ticket token.
        </span>
      </div>
    );
  }

  const { matrix, moduleCount } = qrData;

  // Standard four-module QR quiet zone.
  const padding = 4;
  const totalGridSize = moduleCount + padding * 2;

  return (
    <div
      className={`flex flex-col items-center justify-center p-3 rounded-xl bg-white text-[#080E09] shadow-md border border-white/20 select-none ${className}`}
      style={{ width: size + 24 }}
    >
      {showBranding && (
        <div className="w-full flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-200 text-[10px] font-mono">
          <span className="font-extrabold text-[#080E09] tracking-tight flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#648E37] inline-block" />
            ClaimMyPass
          </span>

          <span className="text-[#648E37] font-semibold flex items-center gap-0.5">
            <ShieldCheck className="w-3 h-3" />
            Signed QR
          </span>
        </div>
      )}

      {/* Scanner-friendly QR: no centre watermark or overlay */}
      <div className="flex items-center justify-center bg-white">
        <svg
          viewBox={`0 0 ${totalGridSize} ${totalGridSize}`}
          width={size}
          height={size}
          className="block"
          shapeRendering="crispEdges"
          role="img"
          aria-label={`Signed ticket QR for ${bookingId}`}
        >
          <rect
            x="0"
            y="0"
            width={totalGridSize}
            height={totalGridSize}
            fill="#FFFFFF"
          />

          {matrix.map((row, r) =>
            row.map((isDark, c) =>
              isDark ? (
                <rect
                  key={`${r}-${c}`}
                  x={c + padding}
                  y={r + padding}
                  width="1"
                  height="1"
                  fill="#080E09"
                />
              ) : null
            )
          )}
        </svg>
      </div>

      <div className="w-full text-center mt-2 pt-2 border-t border-zinc-100 space-y-0.5">
        <div className="text-[9px] font-mono font-bold tracking-wider text-zinc-700 uppercase">
          Scan at entry
        </div>

        <div className="text-[8px] font-mono text-zinc-400 truncate max-w-[140px] mx-auto">
          {bookingId}
        </div>
      </div>
    </div>
  );
};