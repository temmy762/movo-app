"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function SetupForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Could not save card. Please try again.");
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/home/payment"), 1800);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#dcfce7" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-[15px] font-bold text-gray-900">Card saved successfully!</p>
        <p className="text-[12px] text-gray-400">Redirecting…</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl overflow-hidden border border-gray-200 p-4 mb-4">
        <PaymentElement />
      </div>
      {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!stripe || submitting}
        className="w-full py-3 rounded-xl text-white font-bold text-[13px]"
        style={{
          background: !stripe || submitting
            ? "#9ca3af"
            : "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)",
        }}
      >
        {submitting ? "Saving…" : "Save card"}
      </button>
    </>
  );
}

function AddCardContent() {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stripe/setup-intent", { method: "POST" })
      .then(r => r.json())
      .then(d => {
        if (d.clientSecret) setClientSecret(d.clientSecret);
        else setLoadError(d.error ?? "Could not initialise. Please try again.");
      })
      .catch(() => setLoadError("Could not connect. Please try again."));
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-gray-100 relative">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-5 no-hover-fx"
            aria-label="Go back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[18px] font-bold text-gray-900">Add card</h1>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 px-3 py-5">
          <div className="hidden md:block" />

          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-5">
            {loadError && (
              <p className="text-[13px] text-red-500 text-center py-6">{loadError}</p>
            )}
            {!clientSecret && !loadError && (
              <div className="flex items-center gap-2 text-[13px] text-gray-400 py-6 justify-center">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin shrink-0" />
                Loading…
              </div>
            )}
            {clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SetupForm />
              </Elements>
            )}
          </div>

          <div className="hidden md:block" />
        </div>
      </div>
    </div>
  );
}

export default function AddCardPage() {
  return (
    <Suspense>
      <AddCardContent />
    </Suspense>
  );
}
