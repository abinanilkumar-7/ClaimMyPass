import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useBooking } from "../../context/BookingContext";
import {
    Camera,
    CameraOff,
    CheckCircle2,
    CircleAlert,
    Clock,
    ScanLine,
    ShieldCheck,
    Ticket,
    UserCheck,
    Users,
    XCircle,
    RefreshCw,
} from "lucide-react";

import {
    checkInTicket,
    verifyStaffAccess,
    StaffApiError,
    type TicketCheckInResult,
} from "../../services/staffApi";

const READER_ID = "claimmypass-staff-qr-reader";

type ScannerState =
    | "idle"
    | "starting"
    | "scanning"
    | "checking";

interface StaffScannerProps {
    onBack?: () => void;
}

type DisplayResult = TicketCheckInResult & {
    checked_in_at?: string;
    checked_in_by?: string | null;
};

export const StaffScanner: React.FC<StaffScannerProps> = ({
  onBack,
}) => {
  const { setCurrentView } = useBooking();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraStartedRef = useRef(false);
  const processingRef = useRef(false);

  // Staff authorization state
  const [accessStatus, setAccessStatus] = useState<
    "checking" | "allowed" | "denied"
  >("checking");

  const [accessMessage, setAccessMessage] = useState(
    "Verifying staff permissions..."
  );

  const [requiresSignIn, setRequiresSignIn] = useState(false);

  // Scanner state
  const [scannerState, setScannerState] =
    useState<ScannerState>("idle");

  const [result, setResult] =
    useState<DisplayResult | null>(null);

  const [cameraError, setCameraError] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);

  // Verify staff permissions with Django.
  useEffect(() => {
    let active = true;

    verifyStaffAccess()
      .then((response) => {
        if (!active) return;

        if (response.authorized) {
          setAccessStatus("allowed");
          setAccessMessage(
            `Welcome, ${response.username}. Staff access verified.`
          );
        } else {
          setAccessStatus("denied");
          setAccessMessage(
            "Staff access could not be verified."
          );
        }
      })
      .catch((error) => {
        if (!active) return;

        setAccessStatus("denied");

        if (error instanceof StaffApiError) {
          setAccessMessage(error.message);
          setRequiresSignIn(error.status === 401);
        } else {
          setAccessMessage(
            "Unable to verify staff permissions."
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);
    const stopCamera = async () => {
    const scanner = scannerRef.current;

    if (!scanner) return;

    try {
        if (cameraStartedRef.current) {
            await scanner.stop();
        }
    } catch (error) {
        console.warn("Camera stop warning:", error);
    } finally {
        cameraStartedRef.current = false;

        try {
            scanner.clear();
        } catch {
        // The scanner may already have cleared its UI.
        }

      if (scannerRef.current === scanner) {
        scannerRef.current = null;
      }
    }
  };

  const processScannedToken = async (decodedText: string) => {
    if (processingRef.current) return;

    processingRef.current = true;
    setScannerState("checking");
    setCameraError("");
    setScanCount((count) => count + 1);

    // Stop reading frames before submitting the token.
    await stopCamera();

    try {
      const response = await checkInTicket(decodedText);

      setResult(response);

      if (response.valid) {
        setApprovedCount((count) => count + 1);
      }
    } catch (error) {
      if (error instanceof StaffApiError) {
        setResult({
          valid: false,
          already_used: error.payload.already_used,
          detail: error.message,
          checked_in_at: error.payload.checked_in_at,
          checked_in_by: error.payload.checked_in_by,
        });
      } else {
        setResult({
          valid: false,
          detail:
            error instanceof Error
              ? error.message
              : "An unexpected verification error occurred.",
        });
      }
    } finally {
      setScannerState("idle");
      processingRef.current = false;
    }
  };

  const startCamera = async () => {
    if (accessStatus !== "allowed") {
        setCameraError(
        "Staff authorization is required before scanning."
    );
    return;
}
    if (
      scannerState === "starting" ||
      scannerState === "scanning" ||
      scannerState === "checking"
    ) {
      return;
    }

    setResult(null);
    setCameraError("");
    setScannerState("starting");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is unavailable. Use localhost or an HTTPS connection."
        );
      }

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras.length) {
        throw new Error("No camera was detected on this device.");
      }

      // Prefer the rear camera on phones.
      const selectedCamera =
        cameras.find((camera) =>
          /back|rear|environment/i.test(camera.label)
        ) || cameras[0];

      const scanner = new Html5Qrcode(READER_ID, false);
      scannerRef.current = scanner;

      await scanner.start(
        selectedCamera.id,
        {
          fps: 10,
          qrbox: {
            width: 240,
            height: 240,
          },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (processingRef.current) return;

          void processScannedToken(decodedText);
        },
        () => {
          // Continuous frame misses are normal during scanning.
        }
      );

      cameraStartedRef.current = true;
      setScannerState("scanning");
    } catch (error) {
      console.error("Unable to start staff scanner:", error);

      const scanner = scannerRef.current;

      if (scanner) {
        try {
          scanner.clear();
        } catch {
          // Ignore scanner cleanup errors.
        }

        scannerRef.current = null;
      }

      setScannerState("idle");

      setCameraError(
        error instanceof Error
          ? error.message
          : "Unable to access the camera."
      );
    }
  };

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      if (scanner && cameraStartedRef.current) {
        void scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {
            try {
              scanner.clear();
            } catch {
              // Ignore unmount cleanup errors.
            }
          });
      }
    };
  }, []);

  const isScanning = scannerState === "scanning";
  const isBusy =
    scannerState === "starting" ||
    scannerState === "checking";

  const resultIsDuplicate = Boolean(result?.already_used);

  const formattedCheckInTime = result?.checked_in_at
    ? new Date(result.checked_in_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

      if (accessStatus !== "allowed") {
  return (
    <div className="min-h-screen bg-[#101511] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#7FA35C]/30 bg-[#080E09] p-8 text-center">
        <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-[#FFD900]" />

        <h2 className="text-xl font-extrabold">
          {accessStatus === "checking"
            ? "Verifying staff access"
            : "Staff access required"}
        </h2>

        <p className="mt-3 text-sm text-zinc-400">
          {accessMessage}
        </p>

        {accessStatus === "denied" && (
          <div className="mt-6 flex flex-col gap-3">
            {requiresSignIn && (
              <button
                onClick={() => setCurrentView("sign-in")}
                className="rounded-xl bg-[#FFD900] px-5 py-3 font-bold text-[#101511]"
              >
                Sign in with staff account
              </button>
            )}

            <button
              onClick={() => {
                window.history.replaceState({}, "", "/");
                onBack?.();
              }}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-zinc-300"
            >
              Return to homepage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen w-full bg-[#101511] text-white">
      {/* Header */}
      <header className="border-b border-[#7FA35C]/20 bg-[#080E09]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#7FA35C]/40 bg-[#648E37]/15">
                <ScanLine className="h-5 w-5 text-[#FFD900]" />
              </div>

              <div>
                <h1 className="text-lg font-black tracking-tight text-[#FFD900]">
                  ClaimMyPass
                </h1>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7FA35C]">
                  Staff entry management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-[#7FA35C]/30 bg-[#648E37]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B8D68A] sm:inline-flex">
                Staff portal
              </span>

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-[#FFD900]/50 hover:text-white"
                >
                  Back
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {/* Page title */}
        <div className="mb-7">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#7FA35C]">
            <ShieldCheck className="h-4 w-4" />
            SECURE TICKET VALIDATION
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Ticket Verification
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Scan a customer's signed digital ticket to validate
            the booking and authorize cinema entry.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          {/* Scanner panel */}
          <section className="overflow-hidden rounded-2xl border border-[#7FA35C]/25 bg-[#080E09] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-[#FFD900]" />
                <h3 className="text-sm font-bold text-white">
                  QR Scanner
                </h3>
              </div>

              <span
                className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${
                  isScanning
                    ? "text-emerald-400"
                    : isBusy
                      ? "text-amber-400"
                      : "text-zinc-500"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isScanning
                      ? "animate-pulse bg-emerald-400"
                      : isBusy
                        ? "animate-pulse bg-amber-400"
                        : "bg-zinc-600"
                  }`}
                />
                {scannerState === "scanning"
                  ? "Live"
                  : scannerState === "starting"
                    ? "Starting"
                    : scannerState === "checking"
                      ? "Verifying"
                      : "Camera off"}
              </span>
            </div>

            <div className="p-4 sm:p-6">
              <div className="relative overflow-hidden rounded-xl border border-[#7FA35C]/20 bg-black">
                {/* html5-qrcode renders its camera preview inside this div */}
                <div
                  id={READER_ID}
                  className="min-h-[280px] w-full overflow-hidden [&_video]:w-full [&_video]:rounded-xl [&_video]:object-cover"
                />

                {!isScanning && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#080E09]/80 px-6 text-center">
                    {scannerState === "checking" ? (
                      <RefreshCw className="mb-3 h-10 w-10 animate-spin text-[#FFD900]" />
                    ) : (
                      <CameraOff className="mb-3 h-10 w-10 text-zinc-500" />
                    )}

                    <p className="text-sm font-bold text-white">
                      {scannerState === "checking"
                        ? "Verifying ticket"
                        : scannerState === "starting"
                          ? "Opening camera"
                          : "Camera is inactive"}
                    </p>

                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-400">
                      {scannerState === "checking"
                        ? "Checking the signed ticket against the booking database."
                        : "Press Start Scanner to request camera access."}
                    </p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="mt-4 flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Camera unavailable</p>
                    <p className="mt-1 text-xs leading-relaxed text-red-200/80">
                      {cameraError}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                {!isScanning ? (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    disabled={isBusy}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FFD900] px-5 py-3.5 text-sm font-extrabold text-[#101511] shadow-lg shadow-yellow-500/10 transition hover:bg-[#FFFC72] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {scannerState === "checking" ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}

                    {scannerState === "starting"
                      ? "Starting camera..."
                      : scannerState === "checking"
                        ? "Verifying ticket..."
                        : "Start Scanner"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void stopCamera().then(() => setScannerState("idle"))}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-3.5 text-sm font-bold text-red-300 transition hover:bg-red-500/20"
                  >
                    <CameraOff className="h-4 w-4" />
                    Stop Scanner
                  </button>
                )}
              </div>

              <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-500">
                Camera permission is requested only when you start scanning.
                Keep the entire QR code inside the scanning area.
              </p>
            </div>
          </section>

          {/* Information panel */}
          <aside className="space-y-5">
            {/* Session stats */}
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#080E09] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <ScanLine className="h-4 w-4 text-[#FFD900]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    Session
                  </span>
                </div>
                <p className="text-3xl font-black tabular-nums text-white">
                  {scanCount}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Scan attempts
                </p>
              </div>

              <div className="rounded-2xl border border-[#648E37]/30 bg-[#648E37]/10 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <UserCheck className="h-4 w-4 text-[#A8D66D]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#A8D66D]">
                    Approved
                  </span>
                </div>
                <p className="text-3xl font-black tabular-nums text-white">
                  {approvedCount}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Entries authorized
                </p>
              </div>
            </section>

            {/* Result */}
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#080E09]">
              <div className="border-b border-white/5 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-[#FFD900]" />
                  <h3 className="text-sm font-bold text-white">
                    Verification result
                  </h3>
                </div>
              </div>

              <div className="p-5">
                {!result ? (
                  <div className="flex min-h-36 flex-col items-center justify-center text-center">
                    <ShieldCheck className="mb-3 h-9 w-9 text-zinc-700" />
                    <p className="text-sm font-semibold text-zinc-400">
                      Awaiting ticket
                    </p>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-600">
                      Scan a customer's QR code to see the server's
                      validation result here.
                    </p>
                  </div>
                ) : result.valid ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-400" />
                      <div>
                        <p className="text-sm font-extrabold text-emerald-300">
                          Entry authorized
                        </p>
                        <p className="mt-1 text-xs text-emerald-200/70">
                          Ticket verified and checked in.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Booking
                        </p>
                        <p className="mt-1 break-all font-mono text-xs text-[#FFD900]">
                          {result.booking_id}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Movie
                        </p>
                        <p className="mt-1 font-semibold text-white">
                          {result.movie}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Theatre / Screen
                        </p>
                        <p className="mt-1 text-zinc-200">
                          {result.theatre} · {result.screen}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Allocated seats
                        </p>
                        <p className="mt-1 font-semibold text-white">
                          {result.seats?.join(", ") || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      className={`flex items-center gap-3 rounded-xl border p-4 ${
                        resultIsDuplicate
                          ? "border-amber-500/30 bg-amber-500/10"
                          : "border-red-500/30 bg-red-500/10"
                      }`}
                    >
                      {resultIsDuplicate ? (
                        <Clock className="h-8 w-8 shrink-0 text-amber-400" />
                      ) : (
                        <XCircle className="h-8 w-8 shrink-0 text-red-400" />
                      )}

                      <div>
                        <p
                          className={`text-sm font-extrabold ${
                            resultIsDuplicate
                              ? "text-amber-300"
                              : "text-red-300"
                          }`}
                        >
                          {resultIsDuplicate
                            ? "Ticket already used"
                            : "Entry not authorized"}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                          {result.detail}
                        </p>
                      </div>
                    </div>

                    {formattedCheckInTime && (
                      <div className="text-xs text-zinc-400">
                        Previously checked in: {formattedCheckInTime}
                        {result.checked_in_by
                          ? ` · By ${result.checked_in_by}`
                          : ""}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {result && (
                <div className="border-t border-white/5 p-4">
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setCameraError("");
                      void startCamera();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#7FA35C]/40 bg-[#648E37]/10 px-4 py-3 text-xs font-bold text-[#C9E4A5] transition hover:bg-[#648E37]/20"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Scan Next Ticket
                  </button>
                </div>
              )}
            </section>

            {/* Instructions */}
            <section className="rounded-2xl border border-[#7FA35C]/20 bg-[#648E37]/5 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Users className="h-4 w-4 text-[#FFD900]" />
                Entry guidelines
              </h3>

              <ul className="space-y-2.5 text-xs leading-relaxed text-zinc-400">
                <li>1. Scan the QR displayed on the customer's digital pass.</li>
                <li>2. Wait for server verification before allowing entry.</li>
                <li>3. Check the movie, screen and seat allocation.</li>
                <li>4. A previously used ticket must not be admitted again.</li>
              </ul>
            </section>

            <div className="flex items-start gap-2 px-1 text-[10px] leading-relaxed text-zinc-600">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Ticket authorization is performed by the Django backend.
              The scanner interface cannot independently approve entry.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};