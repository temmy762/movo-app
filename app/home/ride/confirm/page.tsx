"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : Promise.resolve(null);

const carTierMap: Record<string, string> = {
  "Movo Classic": "classic",
  "Movo Premium": "premium",
  "Movo Privé Black": "black",
};

type FareEstimate = {
  fare: number; serviceFee: number; gst: number; total: number;
  additionalStopFee: number; airportFee: number;
  distanceKm: number | null; durationMin: number | null;
  gstRate: number; serviceFeeRate: number;
  stopFeeUnit: number; airportFeeUnit: number;
  freeWaitingMinutes: number; waitingRatePerMin: number;
  stops: number; isAirport: boolean;
};

type CheckoutFormProps = {
  pickup: string; dropoff: string; carName: string;
  tier: string; carImg: string; driverId: string;
  clientName: string; intentId: string;
  estimate: FareEstimate;
  isCare?: boolean;
};

function CheckoutForm({ pickup, dropoff, carName, tier, carImg, driverId, clientName, intentId, estimate, isCare }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolvedTier = tier || carTierMap[carName] || "classic";

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { fare, serviceFee, gst, additionalStopFee, airportFee, total } = estimate;

    /* Build return_url for 3DS — includes all booking data so tracking page can create booking */
    const rp: Record<string, string> = {
      pickup, dropoff, car: carName, paid: "1",
      fare: fare.toString(), serviceFee: serviceFee.toString(),
      gst: gst.toString(), additionalStopFee: additionalStopFee.toString(),
      airportFee: airportFee.toString(), total: total.toString(),
      intentId,
    };
    if (tier)     rp.tier     = tier;
    if (carImg && !carImg.startsWith("data:")) rp.carImg = carImg;
    if (driverId) rp.driverId = driverId;
    const returnUrl = `${window.location.origin}/home/ride/tracking?${new URLSearchParams(rp).toString()}`;

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: returnUrl },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    if (isCare) {
      /* ── Movo Care Ride ── POST /api/bookings/care */
      const careRes = await fetch("/api/bookings/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName, pickup, dropoff,
          fare, serviceFee, gst, total,
          paymentStatus: "PAID",
          stripePaymentIntentId: intentId,
        }),
      }).then(r => r.json()).catch(() => null);

      const cp: Record<string, string> = { pickup, dropoff, car: "Movo Care Ride", tier: "black", paid: "1", service: "care" };
      if (careRes?.bookingId) cp.bookingId = careRes.bookingId;
      router.push(`/home/ride/tracking?${new URLSearchParams(cp).toString()}`);
      return;
    }

    /* ── Standard booking ── POST /api/bookings */
    const bookingRes = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName, pickup, dropoff,
        carTier: resolvedTier, carName,
        fare, serviceFee, gst, additionalStopFee, airportFee, total,
        paymentStatus: "PAID",
        stripePaymentIntentId: intentId,
        ...(driverId ? { driverId } : {}),
      }),
    }).then(r => r.json()).catch(() => null);

    const tp: Record<string, string> = { pickup, dropoff, car: carName, paid: "1" };
    if (bookingRes?.id) tp.bookingId = bookingRes.id;
    if (tier)           tp.tier      = tier;
    if (carImg && !carImg.startsWith("data:")) tp.carImg = carImg;
    if (driverId)       tp.driverId  = driverId;
    router.push(`/home/ride/tracking?${new URLSearchParams(tp).toString()}`);
  };

  return (
    <>
      <div className="rounded-xl overflow-hidden border border-gray-200 p-4 mb-4">
        <PaymentElement />
      </div>
      {error && (
        <p className="text-[12px] text-red-500 mb-3">{error}</p>
      )}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-gray-100">
        <div className="w-full max-w-lg md:max-w-2xl mx-auto">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!stripe || submitting}
            className="w-full py-3.5 rounded-full text-white font-bold text-[15px] tracking-wide"
            style={{
              background: !stripe || submitting
                ? "#9ca3af"
                : "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)",
            }}
          >
            {submitting ? "Processing…" : "Confirm Booking"}
          </button>
        </div>
      </div>
    </>
  );
}

/* Detect if a location string looks like an airport */
const AIRPORT_KEYWORDS = /\b(airport|aeroport|aéroport|YUL|YYZ|YVR|YYC|YEG|YOW|YHZ|YWG|terminal)\b/i;
function isAirportLocation(loc: string) { return AIRPORT_KEYWORDS.test(loc); }

function ConfirmPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pickup    = searchParams.get("pickup")   || "Pickup address";
  const dropoff   = searchParams.get("dropoff")  || "Destination";
  const carName   = searchParams.get("car")      || "Standard Ride";
  const tier      = searchParams.get("tier")     || "";
  const carImg    = searchParams.get("carImg")   || "";
  const driverId  = searchParams.get("driverId") || "";
  const isCare    = searchParams.get("service")  === "care";

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [stops, setStops] = useState(0);
  const [airportPickup, setAirportPickup] = useState(false);
  const { user, loading: userLoading } = useCurrentUser();
  const clientName = user ? `${user.firstName} ${user.lastName}`.trim() : "Guest";
  const resolvedTier = isCare ? "black" : (tier || carTierMap[carName] || "classic");

  /* Auto-detect airport on mount */
  useEffect(() => {
    if (isAirportLocation(pickup) || isAirportLocation(dropoff)) setAirportPickup(true);
  }, [pickup, dropoff]);

  /* Step 1 — Fetch fare estimate (re-runs when stops or airportPickup changes) */
  useEffect(() => {
    if (!pickup || !dropoff) { setEstimating(false); return; }
    setEstimating(true);
    setEstimateError(null);
    /* Reset payment intent so a fresh one is created for the new fare */
    setClientSecret(null);
    setIntentId(null);
    const url = `/api/bookings/estimate?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&tier=${encodeURIComponent(resolvedTier)}&stops=${stops}&isAirport=${airportPickup}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.fare != null) setEstimate(d);
        else if (d.error) setEstimateError(d.error);
      })
      .catch(() => setEstimateError("Failed to calculate fare. Please try again."))
      .finally(() => setEstimating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff, resolvedTier, stops, airportPickup, retryKey]);

  /* Step 2 — Once estimate + user ready, create ONLY the payment intent */
  useEffect(() => {
    if (userLoading || !clientName || clientName === "Guest" || !estimate) return;

    const { total } = estimate;

    setIntentError(null);
    /* No idempotency key — always create a fresh intent so we never get a
       stale/already-confirmed secret back from Stripe on repeat visits */
    fetch("/api/stripe/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setIntentId(data.id);
        } else {
          console.error("[confirm] payment intent error:", data);
          setIntentError(data.error || "Could not initialise payment. Please try again.");
        }
      })
      .catch((e) => {
        console.error("[confirm] payment intent fetch failed:", e);
        setIntentError("Could not initialise payment. Please try again.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName, estimate, userLoading]);

  return (
    <div
      className="min-h-screen flex flex-col bg-white"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="w-full max-w-lg md:max-w-2xl mx-auto px-5 md:px-10 pt-6 md:pt-10">

          {/* Back */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[14px] text-gray-500 mb-5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          {/* Title */}
          <h1 className="text-center text-[22px] md:text-[28px] font-bold text-gray-900">Confirm &amp; Pay</h1>
          {isCare && (
            <p className="text-center text-[12px] text-gray-400 mt-1">Movo Care Ride · Two chauffeurs included</p>
          )}

          {/* Care info banner */}
          {isCare && (
            <div className="mt-4 rounded-xl p-3 flex items-start gap-2"
              style={{ background: "linear-gradient(135deg,#0A0A0F,#131936)", border: "1px solid rgba(198,191,178,0.2)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C6BFB2" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <div>
                <p className="text-[12px] font-bold text-white mb-0.5">Movo Care Ride</p>
                <p className="text-[11px] text-white/60 leading-snug">A primary chauffeur will drive you home in your vehicle. A support chauffeur follows separately and is dispatched once the primary accepts.</p>
              </div>
            </div>
          )}

          {/* Ride Summary */}
          <div className="mt-6">
            <p className="text-[14px] md:text-[15px] font-bold text-gray-900 mb-3">{isCare ? "Your Vehicle" : carName}</p>

            <div className="relative flex flex-col gap-3">
              {/* Vertical connector */}
              <div className="absolute left-[9px] top-[18px] bottom-[18px] w-px bg-gray-200" />

              {/* Pickup address */}
              <div className="flex items-start gap-3">
                <div className="w-[18px] h-[18px] rounded-full shrink-0 z-10 mt-0.5 flex items-center justify-center" style={{ background: "#131936" }}>
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] md:text-[14px] font-semibold text-gray-900 break-words">{pickup}</p>
                </div>
              </div>

              {/* Dropoff address */}
              <div className="flex items-start gap-3">
                <div className="w-[18px] h-[18px] rounded-full shrink-0 z-10 mt-0.5 flex items-center justify-center bg-red-500">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] md:text-[14px] font-semibold text-gray-900 break-words">{dropoff}</p>
                </div>
              </div>
            </div>

            <p className="text-[12px] md:text-[13px] text-gray-400 mt-2 ml-7">Arrives at 2:55 PM</p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 my-5" />

          {/* Payment Method */}
          <div>
            <p className="text-[14px] md:text-[15px] font-bold text-gray-900 mb-3">Payment Method</p>

            {/* User not logged in */}
            {!userLoading && !user && (
              <div className="text-[13px] text-red-500 py-3">
                Please log in to complete your booking.
              </div>
            )}

            {/* Stripe key missing */}
            {!STRIPE_KEY && (
              <div className="text-[12px] text-red-500 py-3">
                Payment system not configured. Please contact support.
              </div>
            )}

            {/* Estimate error */}
            {estimateError && (
              <div className="text-[12px] text-red-500 py-3 flex items-center justify-between">
                <span>{estimateError}</span>
                <button type="button" onClick={() => { setEstimateError(null); setRetryKey(k => k + 1); }}
                  className="ml-2 px-3 py-1 rounded-full text-[11px] font-bold text-white"
                  style={{ background: "#131936" }}>
                  Retry
                </button>
              </div>
            )}

            {/* Payment intent error */}
            {intentError && (
              <div className="text-[12px] text-red-500 py-3 flex items-center justify-between">
                <span>{intentError}</span>
                <button type="button" onClick={() => { setIntentError(null); setClientSecret(null); setIntentId(null); setRetryKey(k => k + 1); }}
                  className="ml-2 px-3 py-1 rounded-full text-[11px] font-bold text-white"
                  style={{ background: "#131936" }}>
                  Retry
                </button>
              </div>
            )}

            {/* Loading state */}
            {!clientSecret && !intentError && !estimateError && STRIPE_KEY && user && (
              <div className="flex items-center gap-2 text-[13px] text-gray-400 py-4">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin shrink-0" />
                {userLoading ? "Loading profile…" : estimating ? "Calculating fare…" : "Loading payment…"}
              </div>
            )}

            {/* Stripe form */}
            {clientSecret && estimate && intentId && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  pickup={pickup} dropoff={dropoff} carName={carName}
                  tier={tier} carImg={carImg} driverId={driverId}
                  clientName={clientName} intentId={intentId} estimate={estimate}
                  isCare={isCare}
                />
              </Elements>
            )}
            {clientSecret && estimating && (
              <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin shrink-0" />
                Updating price…
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 my-5" />

          {/* Additional Charges */}
          <div>
            <p className="text-[14px] md:text-[15px] font-bold text-gray-900 mb-3">Additional Charges</p>

            {/* Additional Stop */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-[13px] font-semibold text-gray-800">Additional Stop</p>
                <p className="text-[11px] text-gray-400">${estimate?.stopFeeUnit?.toFixed(2) ?? "5.00"} per stop</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setStops(s => Math.max(0, s - 1))}
                  disabled={stops === 0}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 disabled:opacity-30 text-[16px] font-bold">−</button>
                <span className="text-[14px] font-semibold text-gray-900 w-4 text-center">{stops}</span>
                <button type="button" onClick={() => setStops(s => Math.min(5, s + 1))}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 text-[16px] font-bold">+</button>
              </div>
            </div>

            {/* Airport Pickup Fee */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-[13px] font-semibold text-gray-800">Airport Pickup Fee</p>
                <p className="text-[11px] text-gray-400">${estimate?.airportFeeUnit?.toFixed(2) ?? "10.00"} — applies to airport pickups</p>
              </div>
              <button type="button" onClick={() => setAirportPickup(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${airportPickup ? "" : "bg-gray-200"}`}
                style={airportPickup ? { background: "#131936" } : {}}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${airportPickup ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {/* Waiting Time Policy */}
            <div className="flex items-start gap-2 py-3">
              <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <span className="font-semibold text-gray-600">Waiting time:</span> First {estimate?.freeWaitingMinutes ?? 5} minutes complimentary, then ${estimate?.waitingRatePerMin?.toFixed(2) ?? "0.75"}/minute. Charges applied at ride completion.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 my-5" />

          {/* Price breakdown */}
          <div
            className="rounded-xl p-4 flex flex-col gap-2 border border-transparent"
            style={{
              background:
                "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%) border-box",
            }}
          >
            {estimating ? (
              <div className="flex items-center gap-2 text-[13px] text-gray-400 py-2">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin shrink-0" />
                Calculating fare…
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] md:text-[14px] text-gray-600">Ride Fare</span>
                  <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">{estimate ? `$${estimate.fare.toFixed(2)}` : "—"}</span>
                </div>
                {estimate?.distanceKm != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-400 ml-3">Distance</span>
                    <span className="text-[11px] text-gray-400">{estimate.distanceKm} km · {estimate.durationMin} min</span>
                  </div>
                )}
                {(estimate?.additionalStopFee ?? 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] md:text-[14px] text-gray-600">Additional Stop{stops > 1 ? `s (×${stops})` : ""}</span>
                    <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">+${estimate!.additionalStopFee.toFixed(2)}</span>
                  </div>
                )}
                {(estimate?.airportFee ?? 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] md:text-[14px] text-gray-600">Airport Pickup Fee</span>
                    <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">+${estimate!.airportFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[13px] md:text-[14px] text-gray-600">Service Fee ({Math.round((estimate?.serviceFeeRate ?? 0.12) * 100)}%)</span>
                  <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">{estimate ? `$${estimate.serviceFee.toFixed(2)}` : "—"}</span>
                </div>
                <div className="h-px bg-gray-100 my-0.5" />
                <div className="flex justify-between items-center">
                  <span className="text-[13px] md:text-[14px] text-gray-600">GST ({Math.round((estimate?.gstRate ?? 0.05) * 100)}%)</span>
                  <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">{estimate ? `$${estimate.gst.toFixed(2)}` : "—"}</span>
                </div>
                <div className="h-px bg-gray-100 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-[14px] md:text-[15px] font-bold text-gray-900">Total</span>
                  <span className="text-[14px] md:text-[15px] font-bold text-gray-900">{estimate ? `$${estimate.total.toFixed(2)}` : "—"}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">All prices in CAD. GST included in total.</p>
              </>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

export default function ConfirmPayPage() {
  return (
    <Suspense>
      <ConfirmPayContent />
    </Suspense>
  );
}
