"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const quickLinks = [
  { label: "My Rides", href: "/driver/home/finish/my-rides", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )},
  { label: "Rating", href: "/driver/home/finish/rating", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )},
  { label: "Wallet", href: "/driver/home/wallet", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="16" cy="12" r="2" />
    </svg>
  )},
];

export default function FinishPage() {
  const router = useRouter();

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-[18px] font-bold text-gray-900">Finished</h1>
        <button
          className="no-hover-fx text-[13px] font-semibold"
          style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          onClick={() => router.push("/driver/home/finish/my-rides")}
        >
          My rides
        </button>
      </header>

      {/* Quick nav links */}
      <div className="grid grid-cols-3 gap-3 px-4 pt-4">
        {quickLinks.map((l) => (
          <Link key={l.href} href={l.href}
            className="no-hover-fx bg-white rounded-2xl flex flex-col items-center gap-2 py-4 shadow-sm">
            {l.icon}
            <span className="text-[12px] font-semibold text-gray-700">{l.label}</span>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-4">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="#e5e7eb" strokeWidth="1.4" />
        </svg>
        <p className="text-[15px] font-semibold text-gray-700 mb-1">No finished rides yet</p>
        <p className="text-[12px] text-gray-400 text-center mb-3">
          Once you complete a ride it will be shown here.
        </p>
        <button
          className="no-hover-fx text-[13px] font-semibold"
          style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          onClick={() => router.refresh()}
        >
          Refresh
        </button>
      </div>

    </div>
  );
}
