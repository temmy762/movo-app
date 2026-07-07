"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type Reserved = {
  id: string;
  clientName: string;
  pickup: string;
  dropoff: string;
  carName: string;
  fare: number;
  total: number;
  earning: number;
  scheduledAt: string | null;
  paymentStatus: string;
};

function formatWhen(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-CA", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function PlannedPage() {
  const router = useRouter();
  const [rides, setRides] = useState<Reserved[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/driver/reserved")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRides(Array.isArray(d) ? d : []))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNav = (destination: string) => {
    if (!destination) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`, "_blank", "noopener");
  };

  const startTrip = async (id: string) => {
    setActivating(id);
    try {
      const res = await fetch(`/api/bookings/${id}/en-route`, { method: "PATCH" });
      if (res.ok) {
        /* Activated — the rider is now notified and the ride shows in the
           active flow on Home. */
        router.push("/driver/home");
        return;
      }
    } catch { /* fall through */ }
    setActivating(null);
    load();
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-[18px] font-bold text-gray-900">Reserved Rides</h1>
        <button
          className="no-hover-fx text-[13px] font-semibold"
          style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          onClick={() => router.push("/driver/home/finish/my-rides")}
        >
          My rides
        </button>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16 text-[13px] text-gray-400">
          <span className="w-5 h-5 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin mr-2" />
          Loading…
        </div>
      ) : rides.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-4">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-[15px] font-semibold text-gray-700 mb-1">No reserved rides yet</p>
          <p className="text-[12px] text-gray-400 text-center mb-3">
            Scheduled rides you accept will appear here until it&apos;s time to set off.
          </p>
          <button className="no-hover-fx text-[13px] font-semibold"
            style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            onClick={load}>
            Refresh
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {rides.map((r) => {
            const soon = r.scheduledAt ? new Date(r.scheduledAt).getTime() - Date.now() < 60 * 60 * 1000 : false;
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4338ca" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <p className="text-[12px] font-bold text-indigo-700">{formatWhen(r.scheduledAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 leading-none mb-0.5">Your earnings</p>
                    <p className="text-[13px] font-bold leading-none" style={{ color: "#131936" }}>${r.earning.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 mb-3">
                  <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#131936] shrink-0 mt-1" />
                    <p className="text-[12px] text-gray-700 leading-tight">{r.pickup}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1" />
                    <p className="text-[12px] text-gray-700 leading-tight">{r.dropoff}</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mb-3">{r.clientName}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openNav(r.pickup)}
                    className="no-hover-fx w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center shrink-0" title="Navigate to pickup">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                  </button>
                  <button type="button" onClick={() => startTrip(r.id)} disabled={activating === r.id}
                    className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-60"
                    style={{ background: soon ? "linear-gradient(90deg,#1a1a2e,#131936,#C6BFB2)" : "#4b5563" }}>
                    {activating === r.id ? "Starting…" : "I'm heading to pickup"}
                  </button>
                </div>
                {!soon && (
                  <p className="text-[10px] text-gray-400 mt-2 text-center">
                    Tap when you actually set off — the rider is notified you&apos;re on the way.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
