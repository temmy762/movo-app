"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import BottomNav from "../components/BottomNav";

type TabId = "upcoming" | "past" | "canceled";

const tabs: { id: TabId; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "canceled", label: "Canceled" },
];

const emptyStates: Record<TabId, { title: string; desc: string }> = {
  upcoming: {
    title: "You have no upcoming rides",
    desc: "As soon as you book a ride, all of your relevant\nDetails will be shown here.",
  },
  past: {
    title: "You have no past rides",
    desc: "As soon as you book a ride, all of your relevant\nDetails will be shown here.",
  },
  canceled: {
    title: "No canceled rides",
    desc: "Rides that have been canceled will be\nshown here.",
  },
};

const carImages: Record<string, string> = {
  classic: "/images/movo classic.png",
  premium: "/images/movo premium.png",
  black: "/images/prive black.png",
};

interface Booking {
  id: string;
  carName: string;
  carTier: string;
  pickup: string;
  dropoff: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export default function RidesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/user/bookings?tab=${tab}`)
      .then((r) => (r.ok ? r.json() : { bookings: [] }))
      .then((data) => setBookings(data.bookings ?? []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const empty = emptyStates[tab];
  const rides = bookings;

  return (
    <div
      className="h-screen flex flex-col bg-white"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-32 md:pb-24 flex flex-col">
        <div className="w-full max-w-lg md:max-w-2xl mx-auto flex-1 flex flex-col px-5 md:px-10 pt-6 md:pt-10">
          {/* Title */}
          <h1 className="text-[26px] md:text-[34px] font-bold text-gray-900 leading-tight">Rides</h1>

          {/* Tabs */}
          <div className="mt-4 md:mt-6 flex items-center gap-6 md:gap-10 border-b border-gray-200">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`no-hover-fx relative pb-2.5 md:pb-3 text-[14px] md:text-[16px] font-medium transition-colors ${
                    active ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {t.label}
                  {active && (
                    <span
                      className="absolute left-0 right-0 -bottom-[1px] h-[2px] md:h-[3px] rounded-full"
                      style={{ background: "#C6BFB2" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <p className="text-[13px] text-gray-400">Loading rides…</p>
            </div>
          ) : rides.length > 0 ? (
            /* Ride list */
            <div className="flex-1 pt-4 md:pt-6 space-y-3">
              {rides.map((ride) => (
                <div
                  key={ride.id}
                  role="button"
                  onClick={() => router.push(`/home/rides/${ride.id}`)}
                  className="rounded-2xl px-4 pt-3 pb-3 flex flex-col gap-3 border border-transparent cursor-pointer active:scale-[0.99] transition-transform"
                  style={{
                    background:
                      "linear-gradient(#d6d6d6, #d6d6d6) padding-box, linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%) border-box",
                  }}
                >
                  {/* Top row: info + image */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-gray-900">{ride.carName}</p>
                      <p className="text-[12px] text-gray-700 mt-0.5 truncate">{ride.pickup} → {ride.dropoff}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase">{ride.status}</span>
                        <span className="text-[12px] font-bold text-gray-800">${ride.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative w-24 h-16 md:w-28 md:h-20">
                        <Image
                          src={carImages[ride.carTier] ?? "/images/movo classic.png"}
                          alt={ride.carName}
                          fill
                          sizes="(max-width: 768px) 96px, 112px"
                          className="object-contain"
                        />
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>

                  {/* View ticket label */}
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="12" y2="15"/></svg>
                    <span className="text-[11px] text-gray-400">Tap to view ticket</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 md:py-16">
              <div className="relative w-14 h-14 md:w-20 md:h-20 mb-3 md:mb-5 opacity-70">
                <Image
                  src="/images/EMPTYCar.png"
                  alt="Car"
                  fill
                  sizes="(max-width: 768px) 56px, 80px"
                  className="object-contain"
                />
              </div>
              <p className="text-[15px] md:text-[18px] font-bold text-gray-900">{empty.title}</p>
              <p className="text-[12px] md:text-[14px] text-gray-500 mt-1 md:mt-2 whitespace-pre-line leading-snug md:leading-relaxed max-w-md">
                {empty.desc}
              </p>
            </div>
          )}

          {/* Book a ride */}
          <div className="pb-4 md:pb-6">
            <button
              type="button"
              onClick={() => router.push("/home/pickup")}
              className="w-full py-3.5 md:py-4 rounded-full border-[1.5px] text-[14px] md:text-[15px] font-semibold"
              style={{ borderColor: "#131936", color: "#131936" }}
            >
              Book a ride
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
