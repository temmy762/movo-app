"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const carTierMap: Record<string, string> = {
  "Movo Classic": "classic",
  "Movo Premium": "premium",
  "Movo Privé Black": "black",
};

type FareEstimate = { fare: number; serviceFee: number; gst: number; total: number; distanceKm: number | null; durationMin: number | null };

type CheckoutFormProps = {
  pickup: string; dropoff: string; carName: string;
  tier: string; carImg: string; driverId: string;
  clientName: string; intentId: string;
  estimate: FareEstimate;
};

function CheckoutForm({ pickup, dropoff, carName, tier, carImg, driverId, clientName, intentId, estimate }: CheckoutFormProps) {
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

    const { fare, serviceFee, total } = estimate;

    /* Build return_url for 3DS — includes all booking data so tracking page can create booking */
    const rp: Record<string, string> = {
      pickup, dropoff, car: carName, paid: "1",
      fare: fare.toString(), serviceFee: serviceFee.toString(), total: total.toString(),
      intentId,
    };
    if (tier)     rp.tier     = tier;
    if (carImg)   rp.carImg   = carImg;
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

    /* Payment succeeded inline — create booking as PAID */
    const bookingRes = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName, pickup, dropoff,
        carTier: resolvedTier, carName,
        fare, serviceFee, total,
        paymentStatus: "PAID",
        stripePaymentIntentId: intentId,
        ...(driverId ? { driverId } : {}),
      }),
    }).then(r => r.json()).catch(() => null);

    const tp: Record<string, string> = { pickup, dropoff, car: carName, paid: "1" };
    if (bookingRes?.id) tp.bookingId = bookingRes.id;
    if (tier)           tp.tier      = tier;
    if (carImg)         tp.carImg    = carImg;
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

function ConfirmPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pickup    = searchParams.get("pickup")   || "Pickup address";
  const dropoff   = searchParams.get("dropoff")  || "Destination";
  const carName   = searchParams.get("car")      || "Standard Ride";
  const tier      = searchParams.get("tier")     || "";
  const carImg    = searchParams.get("carImg")   || "";
  const driverId  = searchParams.get("driverId") || "";

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [estimating, setEstimating] = useState(true);
  const { user } = useCurrentUser();
  const clientName = user ? `${user.firstName} ${user.lastName}`.trim() : "Guest";
  const resolvedTier = tier || carTierMap[carName] || "classic";

  /* Step 1 — Fetch fare estimate */
  useEffect(() => {
    if (!pickup || !dropoff) { setEstimating(false); return; }
    setEstimating(true);
    fetch(`/api/bookings/estimate?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&tier=${encodeURIComponent(resolvedTier)}`)
      .then((r) => r.json())
      .then((d) => { if (d.fare != null) setEstimate(d); })
      .catch(() => {})
      .finally(() => setEstimating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff, resolvedTier]);

  /* Step 2 — Once estimate + user ready, create ONLY the payment intent */
  useEffect(() => {
    if (!clientName || clientName === "Guest" || !estimate) return;

    const { total } = estimate;
    const idempotencyKey = `pi-${clientName}-${resolvedTier}-${Math.round(total * 100)}-${pickup.slice(0, 20)}`.replace(/\s+/g, "_");

    fetch("/api/stripe/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total, idempotencyKey }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setIntentId(data.id);
        } else {
          setIntentError("Could not initialise payment. Please try again.");
        }
      })
      .catch(() => setIntentError("Could not initialise payment. Please try again."));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName, estimate]);

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

          {/* Ride Summary */}
          <div className="mt-6">
            <p className="text-[14px] md:text-[15px] font-bold text-gray-900 mb-3">{carName}</p>

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
            {intentError && (
              <p className="text-[12px] text-red-500 mb-3">{intentError}</p>
            )}
            {!clientSecret && !intentError && (
              <div className="flex items-center gap-2 text-[13px] text-gray-400 py-4">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin shrink-0" />
                Loading payment…
              </div>
            )}
            {clientSecret && estimate && intentId && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  pickup={pickup} dropoff={dropoff} carName={carName}
                  tier={tier} carImg={carImg} driverId={driverId}
                  clientName={clientName} intentId={intentId} estimate={estimate}
                />
              </Elements>
            )}
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
                  <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">
                    {estimate ? `$${estimate.fare.toFixed(2)}` : "—"}
                  </span>
                </div>
                {estimate?.distanceKm && (
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-gray-400">Distance</span>
                    <span className="text-[12px] text-gray-400">{estimate.distanceKm} km</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[13px] md:text-[14px] text-gray-600">Service Fee</span>
                  <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">
                    {estimate ? `$${estimate.serviceFee.toFixed(2)}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] md:text-[14px] text-gray-600">GST (5%)</span>
                  <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">
                    {estimate ? `$${(estimate.gst ?? 0).toFixed(2)}` : "—"}
                  </span>
                </div>
                <div className="h-px bg-gray-100 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-[14px] md:text-[15px] font-bold text-gray-900">Total</span>
                  <span className="text-[14px] md:text-[15px] font-bold text-gray-900">
                    {estimate ? `$${estimate.total.toFixed(2)}` : "—"}
                  </span>
                </div>
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
