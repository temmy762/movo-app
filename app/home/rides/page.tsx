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
                  className={`relative pb-2.5 md:pb-3 text-[14px] md:text-[16px] font-medium transition-colors ${
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

          {/* Book a ride — MOBILE ONLY: above empty state to avoid bottom-nav overlap */}
          <div className="md:hidden mt-6">
            <button
              type="button"
              onClick={() => router.push("/home/pickup")}
              className="w-full py-3.5 rounded-full border-[1.5px] text-[14px] font-semibold"
              style={{ borderColor: "#2D0A53", color: "#2D0A53" }}
            >
              Book a ride
            </button>
          </div>

          {/* Empty state */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 md:py-16">
            <div className="relative w-14 h-14 md:w-20 md:h-20 mb-3 md:mb-5 opacity-70">
              <Image
                src="/images/Car.png"
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

          {/* Book a ride — DESKTOP ONLY: at the bottom */}
          <div className="hidden md:block pb-6">
            <button
              type="button"
              onClick={() => router.push("/home/pickup")}
              className="w-full max-w-md mx-auto block py-4 rounded-full border-[1.5px] text-[15px] font-semibold"
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
