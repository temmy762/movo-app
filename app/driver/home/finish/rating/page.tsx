"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Review = {
  id: string;
  clientName: string;
  rating: number;
  review: string | null;
  createdAt: string;
};

type RatingsData = {
  avgRating: number | null;
  totalReviews: number;
  reviews: Review[];
};

function Stars({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} width="12" height="12" viewBox="0 0 24 24"
          fill={s <= Math.round(score) ? "#f59e0b" : "none"}
          stroke={s <= Math.round(score) ? "#f59e0b" : "#d1d5db"} strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="text-[12px] font-bold text-gray-800 ml-1">{score.toFixed(1)}</span>
    </div>
  );
}

export default function RatingPage() {
  const router = useRouter();
  const [data, setData] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/driver/ratings")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
            <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-gray-900">Rating</h1>
      </header>

      {/* Avg score summary */}
      {!loading && data && (
        <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-4">
          <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl shadow-sm"
            style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }}>
            <p className="text-[22px] font-black text-white leading-none">
              {data.avgRating != null ? data.avgRating.toFixed(1) : "–"}
            </p>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none" className="mt-0.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-bold text-gray-900">Overall Rating</p>
            <p className="text-[12px] text-gray-400">{data.totalReviews} review{data.totalReviews !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 px-4 pt-4 pb-8 w-full max-w-lg mx-auto md:max-w-2xl">

        {/* Loading */}
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl px-4 py-4 shadow-sm mb-3 flex gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}

        {/* Empty state */}
        {!loading && data?.totalReviews === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-3">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <p className="text-[14px] font-semibold text-gray-700">No ratings yet</p>
            <p className="text-[12px] text-gray-400 mt-1">Ratings will appear after completing rides.</p>
          </div>
        )}

        {/* Review cards */}
        {!loading && data?.reviews?.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl px-4 py-4 shadow-sm mb-3 flex gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[14px] font-semibold text-gray-900">{r.clientName}</p>
                <Stars score={r.rating} />
              </div>
              <p className="text-[11px] text-gray-400 mb-1">{formatDate(r.createdAt)}</p>
              {r.review && <p className="text-[12px] text-gray-500 leading-relaxed">{r.review}</p>}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
