"use client";

import { useEffect, useState, useCallback } from "react";
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PENDING:   { bg: "#fef9c3", color: "#854d0e", label: "Awaiting Acceptance" },
    CONFIRMED: { bg: "#dbeafe", color: "#1e40af", label: "Confirmed" },
    COMPLETED: { bg: "#dcfce7", color: "#166534", label: "Completed" },
    CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" },
  };
  const s = map[status] ?? { bg: "#f3f4f6", color: "#6b7280", label: status };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function RideCard({
  ride,
  isUpcoming,
  onAction,
  acting,
}: {
  ride: Ride;
  isUpcoming: boolean;
  onAction: (id: string, action: "accept" | "reject") => void;
  acting: string | null;
}) {
  const busy = acting === ride.id;

  return (
    <div className="bg-white rounded-2xl px-4 py-4 shadow-sm mb-3">
      {/* Top row */}
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
        <div className="flex flex-col items-end gap-1">
          <span className="text-[14px] font-bold" style={{ color: "#2D0A53" }}>
            £{ride.fare.toFixed(2)}
          </span>
          {isUpcoming && <StatusBadge status={ride.status} />}
        </div>
      </div>

      {/* Route */}
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

      {/* Meta row */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-3">
        <span>Payment: <span className="font-medium text-gray-600">{ride.paymentStatus === "PAID" ? "Paid" : "Unpaid"}</span></span>
        <span>{formatDateTime(ride.createdAt)}</span>
      </div>

      {/* Action buttons — upcoming rides only */}
      {isUpcoming && ride.status === "PENDING" && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(ride.id, "reject")}
            className="no-hover-fx py-2.5 rounded-xl text-[13px] font-bold border border-red-200 text-red-600 bg-red-50 disabled:opacity-50"
          >
            {busy ? "…" : "Reject"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(ride.id, "accept")}
            className="no-hover-fx py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
            style={{ background: busy ? "#d1d5db" : "linear-gradient(90deg,#2D0A53,#8B7500)" }}
          >
            {busy ? "…" : "Accept"}
          </button>
        </div>
      )}

      {/* Confirmed — allow cancellation */}
      {isUpcoming && ride.status === "CONFIRMED" && (
        <div className="pt-3 border-t border-gray-100">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(ride.id, "reject")}
            className="no-hover-fx w-full py-2.5 rounded-xl text-[13px] font-bold border border-red-200 text-red-600 bg-red-50 disabled:opacity-50"
          >
            {busy ? "Cancelling…" : "Cancel Ride"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MyRidesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"past" | "upcoming">("upcoming");
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadRides = useCallback(() => {
    setLoading(true);
    fetch(`/api/driver/rides?tab=${tab}`)
      .then((r) => r.json())
      .then((data) => setRides(Array.isArray(data) ? data : []))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { loadRides(); }, [loadRides]);

  const handleAction = useCallback(async (id: string, action: "accept" | "reject") => {
    setActing(id);
    const newStatus = action === "accept" ? "CONFIRMED" : "CANCELLED";
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, cancelledBy: "driver" }),
      });
      if (res.ok) {
        loadRides();
      } else {
        const d = await res.json();
        alert(d.error ?? "Could not update ride. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setActing(null);
    }
  }, [loadRides]);

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
        {(["upcoming", "past"] as const).map((t) => (
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
              {tab === "past" ? "Completed rides will appear here." : "New ride assignments will appear here."}
            </p>
          </div>
        )}

        {/* Real ride cards */}
        {!loading && rides.map((ride) => (
          <RideCard
            key={ride.id}
            ride={ride}
            isUpcoming={tab === "upcoming"}
            onAction={handleAction}
            acting={acting}
          />
        ))}

      </div>
    </div>
  );
}
