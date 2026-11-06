
import React, { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";

import {
  ArrowLeft,
  Lock,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Ticket,
} from "lucide-react";

import { useBooking } from "../../context/BookingContext";
import { CONCESSIONS } from "../../data/mockData";

import {
  createMovieBookingOrder,
  verifyMovieBookingOrder,
} from "../../services/paymentApi";

import type {
  MovieBookingVerificationResponse,
} from "../../services/paymentApi";


type ProcessingStep =
  | "idle"
  | "creating"
  | "checkout"
  | "verifying"
  | "loading-pass";


export const PaymentModal: React.FC = () => {
  const {
    user,
    selectedMovie,
    selectedTheatre,
    selectedShow,
    currentSeats,
    selectedSeatIds,
    holdToken,
    isHoldActive,
    holdSecondsLeft,
    concessionsCart,
    subtotalTickets,
    subtotalConcessions,
    convenienceFee,
    taxes,
    grandTotal,
    refreshMyPasses,
    activateConfirmedPass,
    setCurrentView,
  } = useBooking();

  const [customerPhone, setCustomerPhone] = useState("");

  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const [processingStep, setProcessingStep] =
    useState<ProcessingStep>("idle");

  const [formError, setFormError] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] =
    useState<string | null>(null);

  const [currentOrderId, setCurrentOrderId] =
    useState<string | null>(null);

  const [verification, setVerification] =
    useState<MovieBookingVerificationResponse | null>(null);

  const [currentOrderAmount, setCurrentOrderAmount] =
    useState<string | null>(null);


  const selectedSeats = currentSeats.filter((seat) =>
    selectedSeatIds.includes(seat.id)
  );

  const selectedConcessions = Object.entries(concessionsCart)
    .map(([id, quantity]) => ({
      item: CONCESSIONS.find((item) => item.id === id),
      quantity,
    }))
    .filter((entry) => Boolean(entry.item));


  const isProcessing = processingStep !== "idle";

  const paymentSuccessful =
    verification?.verified === true &&
    verification?.pass_ready === true &&
    verification?.booking_status === "CONFIRMED";


  // Verify the order directly through Django.
  const verifyOrder = async (orderId: string) => {
  setProcessingStep("verifying");
  setFormError(null);

  try {
    const result = await verifyMovieBookingOrder(orderId);

    setVerification(result);
    setStatusMessage(result.message);

    if (result.pass_ready && result.booking_status === "CONFIRMED") {
      setProcessingStep("loading-pass");

      // Retrieve the confirmed pass from Django.
      const passes = await refreshMyPasses();

      const confirmedPass = passes.find(
        (pass) => pass.bookingId === `CMP-${result.booking_id}`
      );

      if (!confirmedPass) {
        throw new Error(
          "Your booking is confirmed, but the pass could not be loaded. Open My Passes and refresh."
        );
      }

      // Navigate to the actual digital pass.
      activateConfirmedPass(confirmedPass);

    } else if (result.verified) {
      setFormError(
        result.message ||
        "Payment succeeded, but the booking is not confirmed. Please contact support."
      );
    } else if (
      result.booking_status === "CANCELLED" ||
      result.booking_status === "EXPIRED"
    ) {
      setStatusMessage(
        result.message || "Payment was not completed. Please select seats again."
      );
    }

    return result;

  } catch (error) {
    setFormError(
      error instanceof Error
        ? error.message
        : "Unable to verify your booking payment."
    );

    return null;

  } finally {
    setProcessingStep("idle");
  }
};


  // Create the order and launch Cashfree.
  const handlePayNow = async () => {
  setFormError(null);
  setStatusMessage(null);
  setVerification(null);
  setCurrentOrderAmount(null);

  const cleanPhone = customerPhone.replace(/\D/g, "");

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    setFormError("Enter a valid 10-digit Indian mobile number.");
    return;
  }

  if (!agreedToTerms) {
    setFormError(
      "Please accept the Terms of Admission and Privacy Policy."
    );
    return;
  }

  if (!user) {
    setFormError("Please sign in before making a payment.");
    return;
  }

  if (!selectedShow || !/^\d+$/.test(selectedShow.id)) {
    setFormError(
      "Please select a valid database-backed show before payment."
    );
    return;
  }

  if (selectedSeatIds.length === 0) {
    setFormError("Please select at least one seat.");
    return;
  }

  if (!holdToken || !isHoldActive || holdSecondsLeft <= 0) {
    setFormError(
      "Your seat hold is missing or expired. Please select your seats again."
    );
    return;
  }

  const backendSeatIds = selectedSeats.map(
    (seat) => seat.backendId
  );

  if (
    backendSeatIds.some((id) => id === undefined) ||
    backendSeatIds.length !== selectedSeatIds.length
  ) {
    setFormError(
      "Some selected seats do not have database IDs. Reload seat availability."
    );
    return;
  }

  try {
    // STEP 1: Create the real booking and calculate its
    // authoritative total on Django.

    setProcessingStep("creating");

    const order = await createMovieBookingOrder({
      show_id: Number(selectedShow.id),
      seat_ids: backendSeatIds as number[],
      hold_token: holdToken,
      customer_phone: cleanPhone,
      concessions: concessionsCart,
    });

    setCurrentOrderId(order.order_id);
    setCurrentOrderAmount(order.amount);

    // STEP 2: Initialize Cashfree sandbox checkout.

    setProcessingStep("checkout");

    const cashfree = await load({
      mode: "sandbox",
    });

    if (!cashfree) {
      throw new Error(
        "Unable to initialize Cashfree checkout."
      );
    }

    // STEP 3: Open Cashfree hosted payment checkout.

    try {
      await cashfree.checkout({
        paymentSessionId: order.payment_session_id,
        redirectTarget: "_modal",
      });

    } catch (checkoutError) {
      // Closing the popup does not establish payment failure.
      // Always ask Django to verify the actual order status.
      console.warn(
        "Cashfree checkout closed or returned an error.",
        checkoutError
      );
    }

    // STEP 4: Ask Django to verify the transaction.
    // Django confirms the booking and issues no ticket
    // unless payment and seat checks both pass.

    await verifyOrder(order.order_id);

  } catch (error) {
    setFormError(
      error instanceof Error
        ? error.message
        : "Unable to start your movie booking payment."
    );

    setProcessingStep("idle");
  }
};


  // Refresh the status of an existing order.
  const handleRefreshStatus = async () => {
    if (!currentOrderId || isProcessing) return;

    await verifyOrder(currentOrderId);
  };


  // Start a fresh sandbox test.
  const handleNewTest = () => {
    setCurrentOrderId(null);
    setVerification(null);
    setStatusMessage(null);
    setFormError(null);
    setCustomerPhone("");
    setProcessingStep("idle");
  };


  return (
    <div className="w-full min-h-screen bg-[#101511] pb-24 text-zinc-100">

      {/* Header */}

      <div className="w-full bg-[#080E09] border-b border-[#7FA35C]/20 px-4 py-4">

        <div className="max-w-7xl mx-auto flex items-center justify-between">

          <div className="flex items-center gap-3">

            <button
              onClick={() => setCurrentView("concessions")}
              disabled={isProcessing || Boolean(currentOrderId)}
              className="p-2 rounded-lg bg-[#101511] text-zinc-300 border border-[#7FA35C]/30 hover:border-[#FFD900] disabled:opacity-40"
              aria-label="Back to concessions"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#648E37]" />
                Secure Checkout
              </h2>

              <p className="text-xs text-zinc-400 mt-0.5">
                Cashfree hosted payment checkout
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2 text-xs text-[#648E37] font-semibold bg-[#101511] px-3 py-1.5 rounded border border-[#648E37]/40">
            <ShieldCheck className="w-4 h-4" />
            <span>Sandbox Mode</span>
          </div>

        </div>

      </div>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN */}

          <div className="lg:col-span-7 space-y-6">

            {/* Customer information */}

            <div className="bg-[#080E09] border border-[#7FA35C]/20 rounded-xl p-5 space-y-4">

              <h3 className="text-sm font-bold text-[#FFD900] uppercase tracking-wider">
                1. Payment Contact Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">

                <div>
                  <label className="text-zinc-400 block mb-1">
                    Account Name
                  </label>

                  <input
                    type="text"
                    value={user?.name || ""}
                    readOnly
                    className="w-full bg-[#101511] border border-[#7FA35C]/30 rounded-lg p-2.5 text-zinc-300"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">
                    Account Email
                  </label>

                  <input
                    type="email"
                    value={user?.email || ""}
                    readOnly
                    className="w-full bg-[#101511] border border-[#7FA35C]/30 rounded-lg p-2.5 text-zinc-300"
                  />
                </div>

              </div>

              <div>
                <label className="text-zinc-400 block mb-1 text-xs">
                  Mobile Number
                </label>

                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(event) => {
                    setCustomerPhone(
                      event.target.value.replace(/[^\d]/g, "").slice(0, 10)
                    );
                  }}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  disabled={isProcessing || Boolean(currentOrderId)}
                  className="w-full bg-[#101511] border border-[#7FA35C]/30 rounded-lg p-2.5 text-zinc-100 focus:outline-none focus:border-[#FFD900]"
                />
              </div>

            </div>


            {/* Cashfree gateway information */}

            <div className="bg-[#080E09] border border-[#7FA35C]/20 rounded-xl p-5 space-y-4">

              <h3 className="text-sm font-bold text-[#FFD900] uppercase tracking-wider">
                2. Payment Gateway
              </h3>

              <div className="flex items-center gap-3 bg-[#101511] border border-[#7FA35C]/20 rounded-lg p-4">

                <div className="w-11 h-11 rounded-lg bg-[#FFD900]/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#FFD900]" />
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    Cashfree Payments
                  </p>

                  <p className="text-xs text-zinc-400 mt-1">
                    Secure hosted sandbox checkout
                  </p>
                </div>

              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                UPI, credit cards, debit cards and other available
                payment methods will be provided by Cashfree.
                ClaimMyPass does not collect or store your card
                number, CVV or UPI PIN.
              </p>

              <div className="rounded-lg bg-yellow-950/30 border border-yellow-700/40 p-4">

                <p className="text-xs font-bold text-yellow-300">
                  Sandbox Testing Mode
                </p>

                <p className="text-xs text-yellow-100/80 mt-1 leading-relaxed">
                  This is an actual movie booking flow using Cashfree sandbox.
                  No live money is collected. Your booking and digital pass will
                  be confirmed only after the backend payment confirmation.
                </p>

              </div>

            </div>

          </div>


          {/* RIGHT COLUMN */}

          <div className="lg:col-span-5">

            <div className="bg-[#080E09] border border-[#7FA35C]/30 rounded-xl p-6 space-y-5 sticky top-24">

              {/* Booking summary */}

              <div className="border-b border-white/10 pb-4">

                <span className="text-[11px] font-mono text-[#648E37] uppercase tracking-wider">
                  Booking Summary
                </span>

                <h3 className="text-base font-bold text-white mt-1">
                  {selectedMovie?.title || "Selected Movie"}
                </h3>

                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedTheatre?.name} · {selectedShow?.screenName}
                </p>

                <p className="text-xs text-[#FFFC72] font-mono mt-1">
                  {selectedShow?.time} · {selectedShow?.format}
                </p>

              </div>


              {/* Price breakdown */}

              <div className="space-y-2.5 text-xs">

                <div className="flex justify-between text-zinc-300">
                  <span>
                    Seats ({selectedSeats.map((seat) => seat.id).join(", ")})
                  </span>

                  <span>₹{subtotalTickets}</span>
                </div>

                {selectedConcessions.map(({ item, quantity }) => (
                  <div
                    key={item!.id}
                    className="flex justify-between text-zinc-400"
                  >
                    <span>
                      {item!.name} × {quantity}
                    </span>

                    <span>
                      ₹{item!.price * quantity}
                    </span>
                  </div>
                ))}

                <div className="pt-2 border-t border-white/5 flex justify-between text-zinc-400">
                  <span>Convenience Fee</span>
                  <span>₹{convenienceFee}</span>
                </div>

                <div className="flex justify-between text-zinc-400">
                  <span>GST</span>
                  <span>₹{taxes}</span>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-between items-center">

                  <span className="text-zinc-200 font-semibold">
                    Booking Total
                  </span>

                  <span className="text-xl font-bold text-zinc-300 font-mono">
                    ₹{currentOrderAmount
                    ? Number(currentOrderAmount).toFixed(2)
                    : grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>


              {/* Terms */}

              <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer">

                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(event) =>
                    setAgreedToTerms(event.target.checked)
                  }
                  disabled={isProcessing}
                  className="mt-0.5 w-4 h-4 accent-[#FFD900]"
                />

                <span className="text-[11px] leading-relaxed text-zinc-400">
                  I agree to the Terms of Admission and Privacy Policy.
                </span>

              </label>


              {/* Error */}

              {formError && (
                <div className="p-3 rounded-lg bg-red-950/70 border border-red-500/80 text-red-200 text-xs flex items-start gap-2">

                  <AlertCircle className="w-4 h-4 shrink-0" />

                  <span>{formError}</span>

                </div>
              )}


              {/* Verified / pending status */}

              {statusMessage && (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    paymentSuccessful
                      ? "bg-green-950/40 border-green-700/60 text-green-200"
                      : "bg-yellow-950/30 border-yellow-700/50 text-yellow-200"
                  }`}
                >

                  <div className="flex items-center gap-2 font-semibold">

                    {paymentSuccessful ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}

                    {statusMessage}

                  </div>

                  {currentOrderId && (
                    <p className="mt-2 text-[10px] opacity-70">
                      Order reference: {currentOrderId}
                    </p>
                  )}

                  {paymentSuccessful && (
                    <p className="mt-2">
                      Payment verified and booking confirmed. Your digital pass is ready.
                    </p>
                  )}

                </div>
              )}


              {/* Processing indicator */}

              {isProcessing && (
                <div className="p-4 rounded-lg bg-[#101511] border border-[#FFD900] text-center">

                  <Loader2 className="w-5 h-5 animate-spin text-[#FFD900] mx-auto mb-2" />

                  <p className="text-sm font-bold text-[#FFD900]">

                    {processingStep === "creating" &&
                      "Creating your movie booking..."}

                    {processingStep === "checkout" &&
                      "Opening secure Cashfree checkout..."}

                    {processingStep === "verifying" &&
                      "Verifying payment and confirming your seats..."}

                    {processingStep === "loading-pass" &&
                      "Loading your confirmed digital pass..."}
                  </p>

                  <p className="text-[11px] text-zinc-400 mt-1">
                    Please don't refresh the page.
                  </p>

                </div>
              )}


              {/* Pay button */}

              {!currentOrderId && (
                <button
                  type="button"
                  onClick={handlePayNow}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-lg text-sm font-bold bg-[#FFD900] text-[#080E09] hover:bg-[#FFFC72] disabled:opacity-50 shadow-glow-yellow transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}

                  Pay ₹{grandTotal.toFixed(2)} - Sandbox
                </button>
              )}


              {/* Refresh payment status */}

              {currentOrderId && !paymentSuccessful && !isProcessing && (
                <button
                  type="button"
                  onClick={handleRefreshStatus}
                  className="w-full py-3 rounded-lg text-sm font-bold border border-[#FFD900]/50 text-[#FFD900] hover:bg-[#FFD900]/10 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Payment Status
                </button>
              )}


              {/* New test */}

              {currentOrderId && !isProcessing && (
                <button
                  type="button"
                  onClick={handleNewTest}
                  className="w-full py-3 rounded-lg text-xs font-semibold text-zinc-300 border border-white/10 hover:border-[#FFD900]/50"
                >
                  <Ticket className="w-4 h-4 inline mr-2" />
                  Start Another Sandbox Test
                </button>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
