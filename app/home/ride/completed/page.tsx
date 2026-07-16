"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

type BookingData = {
  id: string;
  total: number;
  fare: number;
  serviceFee?: number | null;
  gst?: number | null;
  additionalStopFee?: number | null;
  airportFee?: number | null;
  pickup?: string;
  dropoff?: string;
  completedAt?: string | null;
  paymentStatus?: string;
  carName: string;
  bookingType?: string;
  driver: {
    firstName: string;
    lastName: string;
    vehicle?: { photoUrl?: string | null } | null;
  } | null;
};

type CareAssignmentRow = {
  id: string;
  role: "PRIMARY" | "SUPPORT";
  status: string;
  driver?: { firstName?: string; lastName?: string; photoUrl?: string | null } | null;
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
  const [careAssignments, setCareAssignments] = useState<CareAssignmentRow[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /* Legacy single-driver rating for normal rides */
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [showReportIssue, setShowReportIssue] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    fetch(`/api/bookings/${bookingId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setBooking(d);
        if (d.bookingType === "CARE") {
          /* Fetch full booking with care assignments */
          fetch(`/api/care/${bookingId}`)
            .then((r) => r.ok ? r.json() : null)
            .then((care) => {
              if (care?.careAssignments) {
                setCareAssignments(
                  care.careAssignments
                    .filter((a: CareAssignmentRow) => a.status !== "CANCELLED")
                    .sort((a: CareAssignmentRow, b: CareAssignmentRow) =>
                      a.role === "PRIMARY" ? -1 : b.role === "PRIMARY" ? 1 : 0,
                    ),
                );
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [bookingId]);

  const isCare = booking?.bookingType === "CARE";

  /* Low ratings (≤3★) require written feedback so admin can review issues */
  const normalNeedsFeedback = !isCare && rating > 0 && rating <= 3 && !review.trim();
  const careNeedsFeedback = isCare && careAssignments.some(
    (a) => (ratings[a.id] ?? 0) > 0 && (ratings[a.id] ?? 0) <= 3 && !(reviews[a.id] ?? "").trim(),
  );

  const handleSubmitRating = async () => {
    if (!bookingId || submitting || submitted) return;
    if (!isCare && rating === 0) return;
    if (normalNeedsFeedback || careNeedsFeedback) return;
    setSubmitting(true);
    try {
      if (isCare) {
        /* Submit rating for each Care assignment */
        await Promise.all(
          careAssignments.map((a) => {
            const r = ratings[a.id] ?? 0;
            if (r === 0) return Promise.resolve();
            return fetch(`/api/bookings/${bookingId}/rating`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rating: r, review: reviews[a.id] ?? null, careAssignmentId: a.id }),
            });
          }),
        );
      } else {
        await fetch(`/api/bookings/${bookingId}/rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, review: review || null }),
        });
      }
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
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: "var(--font-body)" }}>

      <div className="px-5 pt-6 pb-3">
        <span className="text-gray-500 text-[15px] font-semibold">Ride</span>
      </div>

      <div className="px-4 pb-8 flex-1 flex flex-col">
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center w-full max-w-sm md:max-w-md mx-auto">

          {/* Check icon */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 mt-2"
            style={{ background: "linear-gradient(135deg,#131936,#C6BFB2)" }}>
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

          {/* Detailed receipt */}
          {booking && amount > 0 && (
            <div className="w-full mb-5 rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Receipt</p>
              {(booking.pickup || booking.dropoff) && (
                <div className="mb-2.5 pb-2.5 border-b border-gray-100">
                  {booking.pickup  && <p className="text-[11px] text-gray-500 truncate">From: <span className="text-gray-700">{booking.pickup}</span></p>}
                  {booking.dropoff && <p className="text-[11px] text-gray-500 truncate mt-0.5">To: <span className="text-gray-700">{booking.dropoff}</span></p>}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Ride Fare</span>
                  <span className="text-gray-800 font-medium">${booking.fare.toFixed(2)}</span>
                </div>
                {(booking.additionalStopFee ?? 0) > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Additional Stops</span>
                    <span className="text-gray-800 font-medium">${booking.additionalStopFee!.toFixed(2)}</span>
                  </div>
                )}
                {(booking.airportFee ?? 0) > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Airport Pickup Fee</span>
                    <span className="text-gray-800 font-medium">${booking.airportFee!.toFixed(2)}</span>
                  </div>
                )}
                {(booking.serviceFee ?? 0) > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Service Fee</span>
                    <span className="text-gray-800 font-medium">${booking.serviceFee!.toFixed(2)}</span>
                  </div>
                )}
                {(booking.gst ?? 0) > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">GST</span>
                    <span className="text-gray-800 font-medium">${booking.gst!.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[13px] pt-1.5 border-t border-gray-100">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-gray-900">${amount.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                A copy of this receipt has been emailed to you. All prices in CAD.
              </p>
            </div>
          )}

          <div className="w-full border-t border-gray-100 mb-5" />

          {/* Chauffeur section */}
          {submitted ? (
            <p className="text-[13px] font-semibold text-green-600 mb-5">Rating submitted — thank you!</p>
          ) : isCare && careAssignments.length > 0 ? (
            /* Care: dual-chauffeur rating */
            <div className="w-full mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6BFB2]">Safe Ride</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">Dual Chauffeur</span>
              </div>
              {careAssignments.map((a) => {
                const name = a.driver
                  ? `${a.driver.firstName ?? ""} ${a.driver.lastName ?? ""}`.trim() || "Chauffeur"
                  : "Chauffeur";
                return (
                  <div key={a.id} className="flex flex-col items-center w-full mb-4 pb-4 border-b border-gray-100 last:border-0 last:mb-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden mb-1.5 border-2 border-gray-100">
                      <DriverAvatar photoUrl={a.driver?.photoUrl ?? null} name={name} />
                    </div>
                    <p className="text-[13px] font-bold text-gray-900">{name}</p>
                    <p className="text-[10px] text-gray-400 mb-2">
                      {a.role === "PRIMARY" ? "Primary Chauffeur" : "Support Chauffeur"}
                    </p>
                    <StarRating rating={ratings[a.id] ?? 0} onRate={(n) => setRatings((prev) => ({ ...prev, [a.id]: n }))} />
                    <textarea
                      value={reviews[a.id] ?? ""}
                      onChange={(e) => setReviews((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      placeholder="Share your experience (optional)…"
                      rows={2}
                      className="w-full mt-2 rounded-xl px-3 py-2 text-[12px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none"
                      style={{ border: "1.5px solid #e5e7eb" }}
                    />
                  </div>
                );
              })}
              {careNeedsFeedback && (
                <p className="text-[11px] text-amber-600 mb-2">Please add feedback for any rating of 3 stars or lower.</p>
              )}
              {Object.values(ratings).some((r) => r > 0) && (
                <button
                  type="button"
                  onClick={handleSubmitRating}
                  disabled={submitting || careNeedsFeedback}
                  className="w-full py-2.5 rounded-xl text-white font-bold text-[13px]"
                  style={{ background: submitting || careNeedsFeedback ? "#9ca3af" : "linear-gradient(90deg,#131936,#C6BFB2)" }}
                >
                  {submitting ? "Submitting…" : "Submit Ratings"}
                </button>
              )}
            </div>
          ) : (
            /* Normal ride: single-driver rating */
            <div className="flex flex-col items-center w-full mb-5">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-2 border-2 border-gray-100">
                <DriverAvatar photoUrl={driverPhoto} name={driverName} />
              </div>
              <p className="text-[14px] font-bold text-gray-900">{driverName}</p>
              <p className="text-[11px] text-gray-400 mb-4">Your Driver</p>
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
              {normalNeedsFeedback && (
                <p className="text-[11px] text-amber-600 mb-2 w-full">Please tell us what went wrong — feedback is required for ratings of 3 stars or lower.</p>
              )}
              {rating > 0 && (
                <button
                  type="button"
                  onClick={handleSubmitRating}
                  disabled={submitting || normalNeedsFeedback}
                  className="w-full py-2.5 rounded-xl text-white font-bold text-[13px] mb-2"
                  style={{ background: submitting || normalNeedsFeedback ? "#9ca3af" : "linear-gradient(90deg,#131936,#C6BFB2)" }}
                >
                  {submitting ? "Submitting…" : "Submit Rating"}
                </button>
              )}
            </div>
          )}

          <div className="w-full border-t border-gray-100 mb-5" />

          {/* Actions */}
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] mb-3 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="1" y="11" width="22" height="10" rx="2" /><path d="M4 11V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4" />
            </svg>
            Book Another Ride
          </button>

          <button
            type="button"
            onClick={() => router.push("/home")}
            className="w-full py-3.5 rounded-xl font-bold text-[14px] border-2 border-gray-200 text-gray-700 flex items-center justify-center gap-2 mb-3"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" />
            </svg>
            Go Home
          </button>

          <button
            type="button"
            onClick={() => setShowReportIssue(true)}
            className="w-full py-3 rounded-xl font-semibold text-[13px] text-gray-500 flex items-center justify-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Report an Issue
          </button>

        </div>
      </div>

      {showReportIssue && bookingId && (
        <ReportIssueModal bookingId={bookingId} onClose={() => setShowReportIssue(false)} />
      )}
    </div>
  );
}

const COMPLAINT_CATEGORIES: { value: string; label: string }[] = [
  { value: "CHAUFFEUR", label: "Chauffeur complaint" },
  { value: "VEHICLE", label: "Vehicle complaint" },
  { value: "BILLING", label: "Billing issue" },
  { value: "SAFETY", label: "Safety concern" },
  { value: "LOST_PROPERTY", label: "Lost property" },
  { value: "GENERAL", label: "General feedback" },
];

function ReportIssueModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const [category, setCategory] = useState("GENERAL");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - photos.length);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setPhotos(p => [...p, reader.result as string].slice(0, 5));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const submit = async () => {
    if (!description.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, category, description, photos }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to submit");
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-[15px] font-bold text-gray-900 mb-1">Thanks for letting us know</p>
            <p className="text-[13px] text-gray-500 mb-5">Our team will review this and follow up if needed.</p>
            <button type="button" onClick={onClose} className="w-full py-3 rounded-xl text-white font-bold text-[14px]" style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>Done</button>
          </div>
        ) : (
          <>
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">Report an Issue</h3>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-[#131936] mb-3">
              {COMPLAINT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Details</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Tell us what happened…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-[#131936] resize-none mb-3" />
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Photos (optional)</label>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
              ))}
              {photos.length < 5 && (
                <label className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
                </label>
              )}
            </div>
            {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600">Cancel</button>
              <button type="button" onClick={submit} disabled={!description.trim() || submitting}
                className="flex-1 py-3 rounded-xl text-white text-[13px] font-bold disabled:opacity-50"
                style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </>
        )}
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
