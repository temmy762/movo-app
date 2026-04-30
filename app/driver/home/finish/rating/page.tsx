"use client";

import { useRouter } from "next/navigation";

type Rating = {
  id: number;
  name: string;
  date: string;
  score: number;
  review: string;
};

const ratings: Rating[] = [
  { id: 1, name: "Muhammad Ali", date: "25 Jan 2025", score: 4.5, review: "Awesome passenger! Super friendly and very prompt. Would love to drive again!" },
  { id: 2, name: "Ismail Achoff", date: "19 Jan 2025", score: 4.0, review: "Awesome passenger! Super friendly and very prompt. Would love to drive again!" },
  { id: 3, name: "Henry Thomas", date: "24 Dec 2025", score: 4.5, review: "Awesome passenger! Super friendly and very prompt. Would love to drive again!" },
  { id: 4, name: "Sandra Williams", date: "23 Dec 2025", score: 3.5, review: "Awesome passenger! Super friendly and very prompt. Would love to drive again!" },
  { id: 5, name: "Precious Clinton", date: "15 Dec 2025", score: 5.0, review: "Awesome passenger! Super friendly and very prompt. Would love to drive again!" },
];

function StarScore({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      <span className="text-[13px] font-bold text-gray-800">{score.toFixed(1)}</span>
    </div>
  );
}

function RatingCard({ r }: { r: Rating }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-4 shadow-sm mb-3 flex gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-[14px] font-semibold text-gray-900">{r.name}</p>
          <StarScore score={r.score} />
        </div>
        <p className="text-[11px] text-gray-400 mb-1">{r.date}</p>
        <p className="text-[12px] text-gray-500 leading-relaxed">{r.review}</p>
      </div>
    </div>
  );
}

export default function RatingPage() {
  const router = useRouter();

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

      {/* List */}
      <div className="flex-1 px-4 pt-4 pb-8 w-full max-w-lg mx-auto md:max-w-2xl">
        {ratings.map((r) => (
          <RatingCard key={r.id} r={r} />
        ))}
      </div>

    </div>
  );
}
