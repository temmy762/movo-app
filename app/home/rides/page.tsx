"use client";

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

export default function RidesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("upcoming");
  const empty = emptyStates[tab];

  return (
    <div
      className="h-screen flex flex-col bg-white"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24 flex flex-col">
        <div className="w-full max-w-lg mx-auto flex-1 flex flex-col px-5 pt-6">
          {/* Title */}
          <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Rides</h1>

          {/* Tabs */}
          <div className="mt-4 flex items-center gap-6 border-b border-gray-200">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`relative pb-2.5 text-[14px] font-medium transition-colors ${
                    active ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {t.label}
                  {active && (
                    <span
                      className="absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full"
                      style={{ background: "#8B7500" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Empty state */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
            <div className="w-16 h-16 mb-4 text-gray-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17h14M5 17l-2-5 2-5h14l2 5-2 5M5 17a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0zM7 12h10" />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-gray-900">{empty.title}</p>
            <p className="text-[12px] text-gray-500 mt-1 whitespace-pre-line leading-snug">
              {empty.desc}
            </p>
          </div>

          {/* Book a ride button */}
          <div className="pb-4">
            <button
              type="button"
              onClick={() => router.push("/home/pickup")}
              className="w-full py-3.5 rounded-full border-[1.5px] text-[14px] font-semibold"
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
