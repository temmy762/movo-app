"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Ride = {
  id: string;
  clientName: string;
  pickup: string;
  dropoff: string;
  carName: string;
  fare: number;
  total: number;
  earning?: number;
  paymentStatus: string;
  createdAt: string;
};

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
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = () => {
    setLoading(true);
    fetch("/api/driver/rides")
      .then((r) => r.json())
      .then((data) => setRides(Array.isArray(data) ? data : []))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRides(); }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-body)" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-[18px] font-bold text-gray-900">Finished</h1>
        <button
          className="no-hover-fx text-[13px] font-semibold"
          style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          onClick={() => router.push("/driver/home/finish/my-rides")}
        >
          My rides
        </button>
      </header>

      {/* Quick nav links — unchanged */}
      <div className="grid grid-cols-3 gap-3 px-4 pt-4">
        {quickLinks.map((l) => (
          <Link key={l.href} href={l.href}
            className="no-hover-fx bg-white rounded-2xl flex flex-col items-center gap-2 py-4 shadow-sm">
            {l.icon}
            <span className="text-[12px] font-semibold text-gray-700">{l.label}</span>
          </Link>
        ))}
      </div>

      {/* Finished rides list below */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">

        {/* Loading skeleton */}
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 mb-3 animate-pulse space-y-2 shadow-sm">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        ))}

        {/* Empty state */}
        {!loading && rides.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-4">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="#e5e7eb" strokeWidth="1.4" />
            </svg>
            <p className="text-[15px] font-semibold text-gray-700 mb-1">No finished rides yet</p>
            <p className="text-[12px] text-gray-400 text-center mb-3">
              Once you complete a ride it will appear here automatically.
            </p>
            <button
              className="no-hover-fx text-[13px] font-semibold"
              style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              onClick={fetchRides}
            >
              Refresh
            </button>
          </div>
        )}

        {/* Ride cards */}
        {!loading && rides.map((ride) => (
          <div key={ride.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[13px] font-bold text-gray-900">{formatDate(ride.createdAt)}</p>
                <p className="text-[11px] text-gray-400">{formatTime(ride.createdAt)}</p>
              </div>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: ride.paymentStatus === "PAID" ? "#dcfce7" : "#fef9c3",
                  color: ride.paymentStatus === "PAID" ? "#16a34a" : "#854d0e",
                }}
              >
                {ride.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
              </span>
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 mt-1 rounded-full bg-[#131936] shrink-0" />
                <p className="text-[12px] text-gray-700 line-clamp-1">{ride.pickup}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 mt-1 rounded-full bg-[#C6BFB2] shrink-0" />
                <p className="text-[12px] text-gray-700 line-clamp-1">{ride.dropoff}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
              <div>
                <p className="text-[11px] text-gray-400">Client</p>
                <p className="text-[13px] font-semibold text-gray-800">{ride.clientName}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-400">Earnings</p>
                <p className="text-[15px] font-bold" style={{ color: "#131936" }}>${(ride.earning ?? 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
