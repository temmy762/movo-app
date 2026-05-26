"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Ride = {
  id: string;
  clientName: string;
  carName: string;
  fare: number;
  pickup: string;
  dropoff: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const date = isToday ? "Today" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${date} | ${time}`;
}

function RideCard({ ride }: { ride: Ride }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-4 shadow-sm mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900">{ride.clientName}</p>
            {ride.carName && <p className="text-[11px] text-gray-400">{ride.carName}</p>}
          </div>
        </div>
        <span className="text-[14px] font-bold text-red-500">${ride.fare.toFixed(2)}</span>
      </div>

      <div className="flex flex-col gap-1.5 mb-3 pl-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }} />
          <p className="text-[12px] text-gray-600 line-clamp-1">{ride.pickup}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
          <p className="text-[12px] text-gray-600 line-clamp-1">{ride.dropoff}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <span>Payment: <span className="font-medium text-gray-600">{ride.paymentStatus === "PAID" ? "Paid" : "Unpaid"}</span></span>
        <span>Date Time: <span className="font-medium text-gray-600">{formatDateTime(ride.createdAt)}</span></span>
      </div>
    </div>
  );
}

export default function MyRidesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"past" | "upcoming">("past");
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/driver/rides?tab=${tab}`)
      .then((r) => r.json())
      .then((data) => setRides(Array.isArray(data) ? data : []))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, [tab]);

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
        <h1 className="text-[18px] font-bold text-gray-900">My Rides</h1>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 px-4">
        {(["past", "upcoming"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="no-hover-fx flex-1 py-3 text-[14px] font-semibold capitalize relative"
            style={{ color: tab === t ? "#2D0A53" : "#9ca3af" }}
          >
            {t === "past" ? "Past" : "Upcoming"}
            {tab === t && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Ride list */}
      <div className="flex-1 px-4 pt-4 pb-8 w-full max-w-lg mx-auto md:max-w-2xl">

        {/* Loading skeleton */}
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl px-4 py-4 shadow-sm mb-3 animate-pulse space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-28" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-14" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        ))}

        {/* Empty state */}
        {!loading && rides.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-3">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="#e5e7eb" strokeWidth="1.4" />
            </svg>
            <p className="text-[14px] font-semibold text-gray-700">
              No {tab === "past" ? "past" : "upcoming"} rides
            </p>
            <p className="text-[12px] text-gray-400 mt-1">
              {tab === "past" ? "Completed rides will appear here." : "Confirmed bookings will appear here."}
            </p>
          </div>
        )}

        {/* Real ride cards */}
        {!loading && rides.map((ride) => (
          <RideCard key={ride.id} ride={ride} />
        ))}

      </div>
    </div>
  );
}
