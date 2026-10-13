"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { IN_CITY_RIDES_ENABLED, AIRPORT_TRANSFER_ENABLED, allowedBookingMode } from "@/lib/launchConfig";
import { bookingExtras, clearSafeRideDraft, getSafeRideDraft, saveSafeRideDraft, vehicleLabel } from "@/lib/safeRideDraft";
import SafeRideSteps from "../../components/SafeRideSteps";
import StopsEditor from "../../components/StopsEditor";

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : Promise.resolve(null);

const carTierMap: Record<string, string> = {
  "Standard": "classic",
  "Executive": "premium",
  "Concierge": "black",
  /* legacy names — drafts/links saved before the rename */
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
  /* Stop addresses this price includes (echoed by the server, signed in the quote) */
  stopAddresses?: string[];
  hourly?: { rate: number; billedHours: number; minHours: number };
  /* Server-signed price — booking creation only trusts amounts inside it */
  quote: string;
};

type CheckoutFormProps = {
  pickup: string; dropoff: string; carName: string;
  tier: string; carImg: string;
  clientName: string; intentId: string;
  estimate: FareEstimate;
  isCare?: boolean;
  scheduledAt?: string | null;
};

type SavedCard = { id: string; brand: string; last4: string; expMonth: number; expYear: number };

/* Shared post-payment step: create the booking (Care or standard) and hand the
   rider to the tracking page. Used by both the new-card (PaymentElement) and
   saved-card checkout paths. No direct-to-driver assignment — every ride is
   routed automatically to whichever eligible chauffeur accepts first. */
async function createBookingAfterPayment(opts: {
  isCare: boolean; pickup: string; dropoff: string; carName: string;
  tier: string; carImg: string; clientName: string;
  intentId: string; estimate: FareEstimate; scheduledAt?: string | null;
  push: (url: string) => void;
}) {
  const { isCare, pickup, dropoff, carName, tier, carImg, intentId, estimate, scheduledAt, push } = opts;
  const { quote } = estimate;
  const resolvedTier = isCare ? "care" : (tier || carTierMap[carName] || "classic");

  if (isCare) {
    const careRes = await fetch("/api/bookings/care", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup, dropoff, quote,
        stripePaymentIntentId: intentId,
        ...(scheduledAt ? { scheduledAt } : {}),
        ...bookingExtras(true, estimate.stopAddresses ?? []),
      }),
    }).then(r => r.json()).catch(() => null);
    if (careRes?.bookingId) clearSafeRideDraft();

    const cp: Record<string, string> = { pickup, dropoff, car: "Safe Ride", tier: "care", paid: "1", service: "care" };
    if (careRes?.bookingId) cp.bookingId = careRes.bookingId;
    push(`/home/ride/tracking?${new URLSearchParams(cp).toString()}`);
    return;
  }

  const bookingRes = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pickup, dropoff, quote,
      carTier: resolvedTier, carName,
      stripePaymentIntentId: intentId,
      ...(scheduledAt ? { scheduledAt } : {}),
      ...bookingExtras(false, estimate.stopAddresses ?? []),
    }),
  }).then(r => r.json()).catch(() => null);
  if (bookingRes?.id) clearSafeRideDraft();

  const tp: Record<string, string> = { pickup, dropoff, car: carName, paid: "1" };
  if (bookingRes?.id) tp.bookingId = bookingRes.id;
  if (tier)           tp.tier      = tier;
  if (carImg && !carImg.startsWith("data:")) tp.carImg = carImg;
  push(`/home/ride/tracking?${new URLSearchParams(tp).toString()}`);
}

/* ── Pay with a saved card (on-session; 3DS handled inline) ── */
function SavedCardPay({ cards, amount, onPaid }: {
  cards: SavedCard[];
  amount: number;
  onPaid: (intentId: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState(cards[0]?.id ?? "");
  const [paying,   setPaying]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const pay = async () => {
    if (!selected || paying) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/charge-saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paymentMethodId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Payment failed");

      if (data.status === "requires_action" && data.clientSecret) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Payment system unavailable");
        const { error: cErr, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret);
        if (cErr) throw new Error(cErr.message ?? "Card authentication failed");
        if (paymentIntent?.status !== "succeeded") throw new Error("Payment not completed");
      } else if (data.status !== "succeeded") {
        throw new Error("Payment not completed. Please try another card.");
      }

      await onPaid(data.id);
      /* keep spinner on — we're navigating away */
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex flex-col gap-2 mb-3">
        {cards.map(c => (
          <label key={c.id}
            className="flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer"
            style={{ borderColor: selected === c.id ? "#131936" : "#e5e7eb", background: selected === c.id ? "#f8f8f6" : "white" }}>
            <input type="radio" name="savedCard" checked={selected === c.id} onChange={() => setSelected(c.id)} className="accent-[#131936]" />
            <span className="text-[13px] font-semibold text-gray-900 capitalize">{c.brand}</span>
            <span className="text-[13px] text-gray-600 font-mono">•••• {c.last4}</span>
            <span className="text-[11px] text-gray-400 ml-auto">{String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
      <button type="button" onClick={pay} disabled={paying || !selected}
        className="w-full py-3.5 rounded-full text-white font-bold text-[15px] tracking-wide"
        style={{ background: paying || !selected ? "#9ca3af" : "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
        {paying ? "Processing…" : `Pay $${amount.toFixed(2)} with saved card`}
      </button>
    </div>
  );
}

function CheckoutForm({ pickup, dropoff, carName, tier, carImg, clientName, intentId, estimate, isCare, scheduledAt }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      intentId, quote: estimate.quote,
    };
    /* Same tier the quote was priced for, so the post-3DS booking matches it */
    rp.tier = isCare ? "care" : (tier || carTierMap[carName] || "classic");
    if (carImg && !carImg.startsWith("data:")) rp.carImg = carImg;
    if (scheduledAt) rp.scheduledAt = scheduledAt;
    if (isCare)      { rp.service = "care"; rp.car = "Safe Ride"; }
    const returnUrl = `${window.location.origin}/home/ride/tracking?${new URLSearchParams(rp).toString()}`;
    /* Survives the 3DS redirect (same tab) so the booking matches the quote */
    saveSafeRideDraft({ stops: estimate.stopAddresses ?? [] });

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

    await createBookingAfterPayment({
      isCare: !!isCare, pickup, dropoff, carName, tier, carImg,
      clientName, intentId, estimate, scheduledAt,
      push: (url) => router.push(url),
    });
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
            {submitting ? "Processing…" : `Pay $${estimate.total.toFixed(2)} & book`}
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
  /* Never take payment for a ride that can't be booked: with In-City switched
     off, everything here is a Safe Ride, and switched-off modes are dropped */
  const isCare    = !IN_CITY_RIDES_ENABLED || searchParams.get("service") === "care";
  const mode      = allowedBookingMode(searchParams.get("mode"));

  /* Scheduling — carried from the pickup widget's date/time pickers */
  const dateParam = searchParams.get("date") || "";
  const timeParam = searchParams.get("time") || "";
  const scheduledAt = (() => {
    if (!dateParam || !timeParam) return null;
    const d = new Date(`${dateParam}T${timeParam}:00`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  })();
  const isScheduled = !!scheduledAt && new Date(scheduledAt).getTime() - Date.now() > 25 * 60 * 1000;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [savedCards,   setSavedCards]   = useState<SavedCard[]>([]);
  const [useNewCard,   setUseNewCard]   = useState(false);
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  /* Stop addresses (max 3) — each change re-prices on the real route */
  const [stopList, setStopList] = useState<string[]>([]);
  /* In-City: booking for someone else */
  const [riderMode, setRiderMode]   = useState<"me" | "other">("me");
  const [otherName, setOtherName]   = useState("");
  const [otherPhone, setOtherPhone] = useState("");
  /* Safe Ride details from steps 2–3 (vehicle, rider) for the summary card */
  const [careDraft] = useState(() => getSafeRideDraft());
  const [airportPickup, setAirportPickup] = useState(false);
  /* Sticky: is the airport fee even relevant to THIS trip? Controls whether the
     toggle is rendered at all — most rides never see it. */
  const [airportRelevant, setAirportRelevant] = useState(false);
  const { user, loading: userLoading } = useCurrentUser();
  const clientName = user ? `${user.firstName} ${user.lastName}`.trim() : "Guest";
  /* Safe Ride has its own admin-configurable pricing tier ("care") — never
     priced off the vehicle tier that happens to accept the job. */
  const resolvedTier = isCare ? "care" : (tier || carTierMap[carName] || "classic");

  /* Airport fee visibility: only Airport Transfer bookings or trips whose
     addresses look like an airport ever see the toggle. Default it ON only
     when the PICKUP is an airport (the fee applies to airport pickups). */
  useEffect(() => {
    /* Airport Transfer switched off: no airport fee, so no toggle either */
    if (!AIRPORT_TRANSFER_ENABLED) return;
    const pickupIsAirport = isAirportLocation(pickup);
    if (mode === "airport" || pickupIsAirport || isAirportLocation(dropoff)) setAirportRelevant(true);
    if (pickupIsAirport) setAirportPickup(true);
  }, [pickup, dropoff, mode]);

  /* Safe Ride needs the vehicle + authorization from steps 2–3 first */
  useEffect(() => {
    if (!isCare) return;
    const d = getSafeRideDraft();
    if (!d.vehicle || !d.consented) router.replace(`/home/care-ride/details?${searchParams.toString()}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCare]);

  /* In-City rider details travel with the booking (and survive a 3DS redirect) */
  useEffect(() => {
    if (isCare) return;
    saveSafeRideDraft({
      inCityRider: riderMode === "other" && otherName.trim() ? { name: otherName.trim(), phone: otherPhone.trim() } : null,
    });
  }, [isCare, riderMode, otherName, otherPhone]);
  const riderIncomplete = !isCare && riderMode === "other" && (!otherName.trim() || otherPhone.replace(/\D/g, "").length < 10);

  /* Load saved cards so returning riders can pay in one tap */
  useEffect(() => {
    if (userLoading || !user) return;
    fetch("/api/stripe/payment-methods")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (Array.isArray(d?.paymentMethods)) setSavedCards(d.paymentMethods); })
      .catch(() => {});
  }, [userLoading, user]);

  /* Step 1 — Fetch fare estimate (re-runs when stops or airportPickup changes) */
  useEffect(() => {
    if (!pickup || !dropoff) { setEstimating(false); return; }
    setEstimating(true);
    setEstimateError(null);
    /* Reset payment intent so a fresh one is created for the new fare */
    setClientSecret(null);
    setIntentId(null);
    const url = `/api/bookings/estimate?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&tier=${encodeURIComponent(resolvedTier)}${stopList.map(a => `&stop=${encodeURIComponent(a)}`).join("")}&isAirport=${!isCare && airportPickup}${!isCare && mode === "hourly" ? "&mode=hourly" : ""}${isCare && scheduledAt ? `&pickupTime=${encodeURIComponent(scheduledAt)}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.fare != null) setEstimate(d);
        else if (d.error) setEstimateError(d.error);
      })
      .catch(() => setEstimateError("Failed to calculate fare. Please try again."))
      .finally(() => setEstimating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff, resolvedTier, stopList.join("|"), airportPickup, retryKey, scheduledAt]);

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
          {isCare ? (
            <>
              <SafeRideSteps step={4} />
              <h1 className="text-[24px] font-bold text-gray-900">Confirm &amp; pay</h1>
              {/* Safe Ride summary */}
              <div className="mt-4 rounded-2xl p-4 flex flex-col gap-2.5 text-white" style={{ background: "#0A0A0F" }}>
                <p className="text-[15px] font-bold flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C6BFB2" strokeWidth="2"><path d="M5 17H3a1 1 0 0 1-1-1v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4a1 1 0 0 1-1 1h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>
                  Safe Ride — your vehicle
                </p>
                {estimate?.distanceKm != null && estimate.durationMin != null && (
                  <p className="text-[13px] text-white/80">{estimate.distanceKm} km • {estimate.durationMin} min</p>
                )}
                {careDraft.vehicle && (
                  <p className="text-[13px] text-white/80">{vehicleLabel(careDraft.vehicle)} • {careDraft.vehicle.transmission}</p>
                )}
                {!!careDraft.passengers && (
                  <p className="text-[13px] text-white/80">{careDraft.passengers} passenger{careDraft.passengers > 1 ? "s" : ""}</p>
                )}
                {careDraft.contact?.forSomeoneElse && (
                  <p className="text-[13px] text-white/80">Rider: {careDraft.contact.riderName}</p>
                )}
              </div>
            </>
          ) : (
            <h1 className="text-center text-[22px] md:text-[28px] font-bold text-gray-900">Confirm &amp; Pay</h1>
          )}

          {/* Ride Summary */}
          <div className="mt-6">
            <p className="text-[14px] md:text-[15px] font-bold text-gray-900 mb-3">{isCare ? "Your trip" : carName}</p>

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

            {/* ETA — computed from the live estimate (was a hardcoded placeholder) */}
            {mode === "hourly" && estimate?.hourly ? (
              <p className="text-[12px] md:text-[13px] text-gray-400 mt-2 ml-7">
                Hourly charter · {estimate.hourly.billedHours}h billed at ${estimate.hourly.rate.toFixed(0)}/h
              </p>
            ) : estimate?.durationMin != null ? (
              <p className="text-[12px] md:text-[13px] text-gray-400 mt-2 ml-7">
                ~{estimate.durationMin} min trip · arrives around{" "}
                {new Date((scheduledAt ? new Date(scheduledAt).getTime() : Date.now()) + estimate.durationMin * 60_000)
                  .toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
              </p>
            ) : null}

            {/* Stops — priced on the real route; updated fare shown below before paying */}
            {mode !== "hourly" && (
              <StopsEditor pickup={pickup} dropoff={dropoff} stops={stopList} onChange={setStopList} disabled={estimating} />
            )}
          </div>

          {/* In-City: who's riding? (Safe Ride asks in step 3) */}
          {!isCare && (
            <div className="mt-5">
              <p className="text-[14px] font-bold text-gray-900 mb-2">Who&apos;s riding?</p>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100">
                {(["me", "other"] as const).map(m => (
                  <button key={m} type="button" onClick={() => setRiderMode(m)}
                    className="no-hover-fx py-2 rounded-lg text-[13px] font-semibold"
                    style={riderMode === m ? { background: "#0A0A0F", color: "white" } : { color: "#374151" }}>
                    {m === "me" ? "I'm riding" : "Someone else"}
                  </button>
                ))}
              </div>
              {riderMode === "other" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <input value={otherName} onChange={e => setOtherName(e.target.value)} placeholder="Rider's full name"
                    className="rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#131936]" />
                  <input value={otherPhone} onChange={e => setOtherPhone(e.target.value)} placeholder="Rider's mobile number" inputMode="tel"
                    className="rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#131936]" />
                  <p className="text-[11px] text-gray-400 sm:col-span-2">Your chauffeur will contact the rider on this number. You&apos;ll get the receipt.</p>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-gray-100 my-5" />

          {/* Payment Method */}
          <div>
            <p className="text-[14px] md:text-[15px] font-bold text-gray-900 mb-3">Payment Method</p>

            {riderIncomplete && (
              <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                Enter the rider&apos;s name and mobile number to continue.
              </div>
            )}

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
            {!clientSecret && !intentError && !estimateError && STRIPE_KEY && user && (savedCards.length === 0 || useNewCard) && (
              <div className="flex items-center gap-2 text-[13px] text-gray-400 py-4">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin shrink-0" />
                {userLoading ? "Loading profile…" : estimating ? "Calculating fare…" : "Loading payment…"}
              </div>
            )}

            {/* Saved cards — one-tap checkout for returning riders */}
            {savedCards.length > 0 && !useNewCard && estimate && !estimating && user && !riderIncomplete && (
              <>
                <SavedCardPay
                  cards={savedCards}
                  amount={estimate.total}
                  onPaid={(paidIntentId) =>
                    createBookingAfterPayment({
                      isCare: !!isCare, pickup, dropoff, carName, tier, carImg,
                      clientName, intentId: paidIntentId, estimate, scheduledAt,
                      push: (url) => router.push(url),
                    })
                  }
                />
                <button type="button" onClick={() => setUseNewCard(true)}
                  className="no-hover-fx text-[12px] font-semibold text-gray-500 underline mb-2">
                  Use a different card
                </button>
              </>
            )}

            {/* Stripe form — new card */}
            {(savedCards.length === 0 || useNewCard) && clientSecret && estimate && intentId && !riderIncomplete && (
              <>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm
                    pickup={pickup} dropoff={dropoff} carName={carName}
                    tier={tier} carImg={carImg} scheduledAt={scheduledAt}
                    clientName={clientName} intentId={intentId} estimate={estimate}
                    isCare={isCare}
                  />
                </Elements>
                <p className="text-[10px] text-gray-400 mt-2">
                  Your card will be securely saved to your account for faster future bookings and in-ride charges (e.g. added stops). You can remove it anytime in Payment settings.
                </p>
                {savedCards.length > 0 && (
                  <button type="button" onClick={() => setUseNewCard(false)}
                    className="no-hover-fx text-[12px] font-semibold text-gray-500 underline mt-2">
                    ← Back to saved cards
                  </button>
                )}
              </>
            )}
            {clientSecret && estimating && (
              <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin shrink-0" />
                Updating price…
              </p>
            )}
          </div>

          {/* Airport Pickup Fee — only rendered for Airport Transfers or trips
              whose addresses look like an airport. Everything else books with a
              clean review screen: route, ETA, payment, fare breakdown, total. */}
          {!isCare && airportRelevant && (
            <>
              <div className="h-px bg-gray-100 my-5" />
              <div className="flex items-center justify-between">
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
            </>
          )}

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
                  <span className="text-[13px] md:text-[14px] text-gray-600">{isCare ? "Safe Ride fare" : "Ride Fare"}</span>
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
                    <span className="text-[13px] md:text-[14px] text-gray-600">Additional Stop{stopList.length > 1 ? `s (×${stopList.length})` : ""}</span>
                    <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">+${estimate!.additionalStopFee.toFixed(2)}</span>
                  </div>
                )}
                {(estimate?.airportFee ?? 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] md:text-[14px] text-gray-600">Airport Pickup Fee</span>
                    <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">+${estimate!.airportFee.toFixed(2)}</span>
                  </div>
                )}
                {/* Safe Ride is all-inclusive — no separate service fee */}
                {!isCare && (
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] md:text-[14px] text-gray-600">Service Fee</span>
                    <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">{estimate ? `$${estimate.serviceFee.toFixed(2)}` : "—"}</span>
                  </div>
                )}
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

          {/* Waiting time + what happens after payment */}
          {estimate && (
            <div className="mt-4 flex flex-col gap-2.5 text-[12px] text-gray-500">
              <p className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {estimate.freeWaitingMinutes} minutes free waiting, then ${estimate.waitingRatePerMin.toFixed(2)}/min.
              </p>
              {isCare && (
                <p className="flex items-start gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  {isScheduled
                    ? "Your chauffeur is confirmed ahead of your pickup time. Details appear once assigned."
                    : "Finding your chauffeur after payment. Details and ETA appear once assigned."}
                </p>
              )}
            </div>
          )}

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
