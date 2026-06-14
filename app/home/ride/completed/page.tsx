"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

type BookingData = {
  id: string;
  total: number;
  fare: number;
  carName: string;
  driver: {
    firstName: string;
    lastName: string;
    vehicle?: { photoUrl?: string | null } | null;
  } | null;
};

function StarRating({ rating, onRate }: { rating: number; onRate: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || rating;
  return (
    <div className="flex items-center justify-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          className="no-hover-fx"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onRate(s)}
          aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill={s <= active ? "#F5C518" : "#e5e7eb"}>
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function DriverAvatar({ photoUrl, name }: { photoUrl?: string | null; name: string }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="w-full h-full object-cover" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    </div>
  );
}

function RideCompletedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || "";

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    fetch(`/api/bookings/${bookingId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setBooking(d); })
      .catch(() => {});
  }, [bookingId]);

  const handleSubmitRating = async () => {
    if (!bookingId || rating === 0 || submitting || submitted) return;
    setSubmitting(true);
    try {
      await fetch(`/api/bookings/${bookingId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, review: review || null }),
      });
      setSubmitted(true);
    } catch {
      /* silent — user can still navigate away */
    } finally {
      setSubmitting(false);
    }
  };

  const driverName = booking?.driver
    ? `${booking.driver.firstName} ${booking.driver.lastName}`
    : "Your Chauffeur";
  const driverPhoto = booking?.driver?.vehicle?.photoUrl ?? null;
  const amount = booking?.total ?? 0;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>

      <div className="px-5 pt-6 pb-3">
        <span className="text-gray-500 text-[15px] font-semibold">Ride</span>
      </div>

      <div className="px-4 pb-8 flex-1 flex flex-col">
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center w-full max-w-sm md:max-w-md mx-auto">

          {/* Check icon */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 mt-2"
            style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="text-[20px] font-extrabold text-gray-900 mb-5 text-center">Ride Completed</h1>

          {/* Amount stat */}
          <div className="w-full mb-5">
            <div className="flex items-center justify-center gap-1 bg-gray-50 rounded-xl py-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span className="text-[22px] font-bold text-gray-900 ml-1">
                {amount > 0 ? `$${amount.toFixed(2)}` : "—"}
              </span>
              <span className="text-[12px] text-gray-400 ml-2 self-end mb-1">Total charged</span>
            </div>
          </div>

          <div className="w-full border-t border-gray-100 mb-5" />

          {/* Driver section */}
          <div className="flex flex-col items-center w-full mb-5">
            <div className="w-16 h-16 rounded-full overflow-hidden mb-2 border-2 border-gray-100">
              <DriverAvatar photoUrl={driverPhoto} name={driverName} />
            </div>
            <p className="text-[14px] font-bold text-gray-900">{driverName}</p>
            <p className="text-[11px] text-gray-400 mb-4">Your Driver</p>

            {submitted ? (
              <p className="text-[13px] font-semibold text-green-600">Rating submitted — thank you!</p>
            ) : (
              <>
                <StarRating rating={rating} onRate={setRating} />
                <p className="text-[11px] text-gray-400 mt-1.5 mb-4">Rate your ride</p>

                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience (optional)…"
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none mb-4"
                  style={{ border: "1.5px solid #c4b5fd" }}
                />

                {rating > 0 && (
                  <button
                    type="button"
                    onClick={handleSubmitRating}
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl text-white font-bold text-[13px] mb-2"
                    style={{ background: submitting ? "#9ca3af" : "linear-gradient(90deg,#2D0A53,#8B7500)" }}
                  >
                    {submitting ? "Submitting…" : "Submit Rating"}
                  </button>
                )}
              </>
            )}
          </div>

          <div className="w-full border-t border-gray-100 mb-5" />

          {/* Actions */}
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] mb-3 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="1" y="11" width="22" height="10" rx="2" /><path d="M4 11V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4" />
            </svg>
            Book Another Ride
          </button>

          <button
            type="button"
            onClick={() => router.push("/home")}
            className="w-full py-3.5 rounded-xl font-bold text-[14px] border-2 border-gray-200 text-gray-700 flex items-center justify-center gap-2"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" />
            </svg>
            Go Home
          </button>

        </div>
      </div>
    </div>
  );
}

export default function RideCompletedPage() {
  return (
    <Suspense>
      <RideCompletedContent />
    </Suspense>
  );
}
