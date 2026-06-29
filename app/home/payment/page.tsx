"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

const brandIcon: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
};

export default function PaymentPage() {
  const router = useRouter();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchCards = useCallback(() => {
    setLoading(true);
    fetch("/api/stripe/payment-methods")
      .then(r => r.json())
      .then(d => setCards(d.paymentMethods ?? []))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const handleRemove = async (pmId: string) => {
    setRemoving(pmId);
    try {
      await fetch("/api/stripe/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      setCards(prev => prev.filter(c => c.id !== pmId));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-gray-100 relative">
          <button type="button" onClick={() => router.back()} className="absolute left-5 no-hover-fx" aria-label="Go back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[18px] font-bold text-gray-900">Payment</h1>
          <button
            type="button"
            onClick={() => router.push("/home/payment/add-card")}
            className="absolute right-5 no-hover-fx"
            aria-label="Add card"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 px-3 py-5">
          <div className="hidden md:block" />

          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[13px] text-gray-400">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin shrink-0" />
                Loading…
              </div>
            ) : cards.length > 0 ? (
              <>
                <p className="text-[13px] text-gray-500 px-1">Saved cards</p>
                {cards.map(card => (
                  <div
                    key={card.id}
                    className="rounded-2xl px-5 py-4 flex items-center gap-4 border border-transparent"
                    style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
                  >
                    <div className="w-12 h-8 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-bold tracking-wider">
                        {brandIcon[card.brand.toLowerCase()] ?? card.brand.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-[14px] font-semibold tracking-widest">•••• {card.last4}</p>
                      <p className="text-white/50 text-[11px] mt-0.5">
                        Expires {String(card.expMonth).padStart(2, "0")}/{String(card.expYear).slice(-2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(card.id)}
                      disabled={removing === card.id}
                      className="shrink-0 disabled:opacity-50"
                      aria-label="Remove card"
                    >
                      {removing === card.id ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => router.push("/home/payment/add-card")}
                  className="w-full py-3 rounded-xl border border-dashed border-gray-300 text-[13px] font-semibold text-gray-500 mt-1"
                >
                  + Add another card
                </button>
              </>
            ) : (
              /* Empty state */
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col items-center justify-between px-4 py-6 text-center">
                <div className="flex flex-col items-center justify-center flex-1">
                  <Image
                    src="/images/57b31fbf43cf6ae8ecdfa0bebede3c0df6e2099d.gif"
                    alt="No payment method"
                    width={130}
                    height={100}
                    className="object-contain mb-5"
                    unoptimized
                  />
                  <p className="text-[12px] text-gray-500 leading-relaxed">
                    To book your first ride, please add a payment method to your account
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/home/payment/add-card")}
                  className="w-full py-3 rounded-xl text-white font-bold text-[13px] mt-5"
                  style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
                >
                  Add payment method
                </button>
              </div>
            )}
          </div>

          <div className="hidden md:block" />
        </div>
      </div>
    </div>
  );
}
