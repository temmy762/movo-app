"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const FARE = 30.00;
const SERVICE_FEE = 5.50;
const TOTAL = 35.50;

const carTierMap: Record<string, string> = {
  "Movo Classic": "classic",
  "Movo Premium": "premium",
  "Movo Privé Black": "black",
};

function CheckoutForm({ pickup, dropoff, carName, clientName }: { pickup: string; dropoff: string; carName: string; clientName: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          pickup,
          dropoff,
          carTier: carTierMap[carName] ?? "classic",
          carName,
          fare: FARE,
          serviceFee: SERVICE_FEE,
          total: TOTAL,
          paymentStatus: "PAID",
          stripePaymentIntentId: paymentIntent?.id ?? null,
        }),
      });
      const booking = await res.json();
      const params = new URLSearchParams({ pickup, dropoff, car: carName, bookingId: booking.id });
      router.push(`/home/ride/tracking?${params.toString()}`);
    } catch {
      setError("Booking could not be saved. Please contact support.");
      setSubmitting(false);
    }
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
                : "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)",
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
  const pickup = searchParams.get("pickup") || "Pickup address";
  const dropoff = searchParams.get("dropoff") || "Destination";
  const carName = searchParams.get("car") || "Standard Ride";
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const clientName = user ? `${user.firstName} ${user.lastName}`.trim() : "Guest";

  useEffect(() => {
    fetch("/api/stripe/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: TOTAL }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.clientSecret) setClientSecret(d.clientSecret);
        else setIntentError("Could not initialise payment. Please try again.");
      })
      .catch(() => setIntentError("Could not initialise payment. Please try again."));
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col bg-white"
      style={{ fontFamily: "var(--font-poppins)" }}
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
                <div className="w-[18px] h-[18px] rounded-full shrink-0 z-10 mt-0.5 flex items-center justify-center" style={{ background: "#2D0A53" }}>
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
                <span className="w-4 h-4 border-2 border-gray-300 border-t-[#2D0A53] rounded-full animate-spin shrink-0" />
                Loading payment…
              </div>
            )}
            {clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm pickup={pickup} dropoff={dropoff} carName={carName} clientName={clientName} />
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
                "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #2D0A53 0%, #8B7500 100%) border-box",
            }}
          >
            <div className="flex justify-between items-center">
              <span className="text-[13px] md:text-[14px] text-gray-600">Ride Fare</span>
              <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">${FARE.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] md:text-[14px] text-gray-600">Service Fee</span>
              <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">${SERVICE_FEE.toFixed(2)}</span>
            </div>
            <div className="h-px bg-gray-100 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-[14px] md:text-[15px] font-bold text-gray-900">Total</span>
              <span className="text-[14px] md:text-[15px] font-bold text-gray-900">${TOTAL.toFixed(2)}</span>
            </div>
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
