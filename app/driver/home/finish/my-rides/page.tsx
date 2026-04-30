"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Ride = {
  id: number;
  name: string;
  vehicle: string;
  amount: string;
  from: string;
  to: string;
  payment: string;
  date: string;
  avatar?: string;
};

const pastRides: Ride[] = [
  { id: 1, name: "Janet Precious", vehicle: "Alfa 500", amount: "$100.00", from: "Chicago, IL", to: "Houston, TX", payment: "Wallet", date: "Today | 10:36 AM" },
  { id: 2, name: "Henry Smith", vehicle: "HB1234", amount: "$59.00", from: "San Diego, CA", to: "San Jose, CA", payment: "Visa", date: "Today | 12:30 AM" },
  { id: 3, name: "Adam Uthman", vehicle: "Alfa 500", amount: "$180.00", from: "Chicago, IL", to: "Houston, TX", payment: "Wallet", date: "25 Jan 2025 | 10:36 AM" },
  { id: 4, name: "Peter William", vehicle: "PW1234", amount: "$85.00", from: "San Diego, CA", to: "San Jose, CA", payment: "Visa", date: "Today | 12:00 AM" },
  { id: 5, name: "Precious Sandra", vehicle: "", amount: "$59.00", from: "San Diego, CA", to: "San Jose, CA", payment: "Visa", date: "13 Dec 2025 | 10:30 AM" },
];

const upcomingRides: Ride[] = [
  { id: 6, name: "Michael Ross", vehicle: "MR2200", amount: "$75.00", from: "New York, NY", to: "Boston, MA", payment: "MasterCard", date: "Tomorrow | 09:00 AM" },
  { id: 7, name: "Sarah Connor", vehicle: "SC4400", amount: "$120.00", from: "Los Angeles, CA", to: "San Francisco, CA", payment: "Wallet", date: "02 Feb 2025 | 14:00 PM" },
];

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
            <p className="text-[14px] font-semibold text-gray-900">{ride.name}</p>
            {ride.vehicle && <p className="text-[11px] text-gray-400">{ride.vehicle}</p>}
          </div>
        </div>
        <span className="text-[14px] font-bold text-red-500">{ride.amount}</span>
      </div>

      <div className="flex flex-col gap-1.5 mb-3 pl-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }} />
          <p className="text-[12px] text-gray-600">{ride.from}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
          <p className="text-[12px] text-gray-600">{ride.to}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <span>Payment: <span className="font-medium text-gray-600">{ride.payment}</span></span>
        <span>Date Time: <span className="font-medium text-gray-600">{ride.date}</span></span>
      </div>
    </div>
  );
}

export default function MyRidesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"past" | "upcoming">("past");
  const rides = tab === "past" ? pastRides : upcomingRides;

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
        {rides.map((ride) => (
          <RideCard key={ride.id} ride={ride} />
        ))}
      </div>

    </div>
  );
}
