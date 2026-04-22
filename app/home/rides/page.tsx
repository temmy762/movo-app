"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

interface Ride {
  name: string;
  specs: string;
  distance: string;
  img: string;
}

// Mock ride data — in production this would come from the API.
const ridesByTab: Record<TabId, Ride[]> = {
  upcoming: [
    {
      name: "Movo Classic",
      specs: "Automatic  |  3 seats  |  Octane",
      distance: "800m (5mins away)",
      img: "/images/movo classic.png",
    },
  ],
  past: [
    {
      name: "Movo Privé Black",
      specs: "Automatic  |  3 seats  |  Octane",
      distance: "800m (5mins away)",
      img: "/images/prive black.png",
    },
  ],
  canceled: [
    {
      name: "Movo Premium",
      specs: "Automatic  |  3 seats  |  Octane",
      distance: "800m (5mins away)",
      img: "/images/movo premium.png",
    },
  ],
};

export default function RidesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("upcoming");
  const empty = emptyStates[tab];
  const rides = ridesByTab[tab];

  return (
    <div
      className="h-screen flex flex-col bg-white"
      style={{ fontFamily: "var(--font-poppins)" }}
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
                      style={{ background: "#8B7500" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {rides.length > 0 ? (
            /* Ride list */
            <div className="flex-1 pt-4 md:pt-6 space-y-3">
              {rides.map((ride, i) => (
                <div
                  key={i}
                  className="rounded-2xl px-4 pt-3 pb-3 flex flex-col gap-3 border border-transparent"
                  style={{
                    background:
                      "linear-gradient(#d6d6d6, #d6d6d6) padding-box, linear-gradient(135deg, #2D0A53 0%, #8B7500 100%) border-box",
                  }}
                >
                  {/* Top row: info + image */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-gray-900">{ride.name}</p>
                      <p className="text-[12px] text-gray-700 mt-0.5">{ride.specs}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2.5">
                          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <p className="text-[12px] text-gray-800">{ride.distance}</p>
                      </div>
                    </div>
                    <div className="relative w-24 h-16 md:w-28 md:h-20 shrink-0">
                      <Image src={ride.img} alt={ride.name} fill sizes="(max-width: 768px) 96px, 112px" className="object-contain" />
                    </div>
                  </div>

                  {/* BOOK NOW button — inside card, gradient border + gradient text */}
                  <button
                    type="button"
                    onClick={() => router.push("/home/pickup")}
                    className="w-full py-2.5 rounded-xl border border-transparent text-[13px] font-bold tracking-widest"
                    style={{
                      background:
                        "linear-gradient(#d6d6d6, #d6d6d6) padding-box, linear-gradient(90deg, #2D0A53 0%, #8B7500 100%) border-box",
                    }}
                  >
                    <span
                      style={{
                        background: "linear-gradient(90deg, #2D0A53 0%, #8B7500 100%)",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      BOOK NOW
                    </span>
                  </button>
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
              style={{ borderColor: "#2D0A53", color: "#2D0A53" }}
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
