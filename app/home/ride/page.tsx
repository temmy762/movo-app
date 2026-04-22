"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

const MiniMap = dynamic(() => import("./MiniMap"), { ssr: false });

function YourRidesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const carName = searchParams.get("car") ?? "";
  const [pickup, setPickup] = useState(searchParams.get("pickup") ?? "");
  const [dropoff, setDropoff] = useState(searchParams.get("dropoff") ?? "");

  return (
    <div
      className="min-h-screen flex flex-col bg-white"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="w-full max-w-lg md:max-w-2xl mx-auto px-5 md:px-10 pt-6 md:pt-10">

          {/* Back */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[14px] text-gray-500 mb-5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          {/* Title */}
          <h1 className="text-center text-[22px] md:text-[28px] font-bold text-gray-900">Your rides</h1>

          {/* Tab */}
          <div className="mt-5 flex border-b border-gray-200">
            <button
              type="button"
              className="no-hover-fx relative pb-2.5 text-[14px] md:text-[16px] font-semibold text-gray-900"
            >
              One way
              <span
                className="absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full"
                style={{ background: "#2D0A53" }}
              />
            </button>
          </div>

          {/* Inputs */}
          <div className="relative mt-5 flex flex-col gap-3">
            <div className="absolute left-[9px] top-[22px] bottom-[22px] w-px bg-gray-300" />

            {/* Pickup */}
            <div className="flex items-center gap-3">
              <div className="w-[10px] h-[10px] rounded-full bg-gray-900 shrink-0 z-10" />
              <div
                className="flex-1 rounded-lg px-3 py-2.5 border-[1.5px]"
                style={{ borderColor: "#2D0A53" }}
              >
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Enter pickup address"
                  className="w-full bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-[13px] md:text-[14px]"
                />
              </div>
            </div>

            {/* Dropoff */}
            <div className="flex items-center gap-3">
              <div className="w-[10px] h-[10px] rounded-full bg-gray-300 border border-gray-400 shrink-0 z-10" />
              <div className="flex-1 rounded-lg px-3 py-2.5 bg-gray-100 border border-gray-200">
                <input
                  type="text"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="Where to?"
                  className="w-full bg-transparent text-gray-600 placeholder-gray-400 focus:outline-none text-[13px] md:text-[14px]"
                />
              </div>
            </div>
          </div>

          {/* Select on map */}
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams({ tier: "all", pickup, dropoff });
              router.push(`/home/pickup?${params.toString()}`);
            }}
            className="mt-5 flex items-center gap-2"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#2D0A53" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="text-[13px] md:text-[14px] font-medium text-gray-800">Select on map</span>
          </button>

          {/* My Current Location card */}
          <div className="mt-5 rounded-2xl border border-gray-200 p-3 bg-white shadow-sm">
            <p className="text-[13px] md:text-[14px] font-semibold text-gray-900">
              My Current{" "}
              <span style={{ color: "#8B7500" }}>Location</span>
            </p>
            <div
              className="mt-3 rounded-xl overflow-hidden border-[2px]"
              style={{ borderColor: "#2D0A53", height: "160px" }}
            >
              <MiniMap />
            </div>
          </div>

        </div>
      </div>

      {/* Confirm Ride button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-gray-100">
        <div className="w-full max-w-lg md:max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams({ pickup, dropoff, car: carName });
              router.push(`/home/ride/confirm?${params.toString()}`);
            }}
            className="w-full py-3.5 rounded-full text-white font-bold text-[15px] tracking-wide"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Confirm Ride
          </button>
        </div>
      </div>
    </div>
  );
}

export default function YourRidesPage() {
  return (
    <Suspense>
      <YourRidesContent />
    </Suspense>
  );
}
