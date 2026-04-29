"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, Suspense } from "react";

const MiniMap = dynamic(() => import("./MiniMap"), { ssr: false });

function YourRidesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const carName = searchParams.get("car") ?? "";
  const [pickup, setPickup] = useState(searchParams.get("pickup") ?? "");
  const [dropoff, setDropoff] = useState(searchParams.get("dropoff") ?? "");
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const reqRef = useRef(0);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedPoint({ lat, lng });
    setLookingUp(true);
    const reqId = ++reqRef.current;
    setDropoff(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (reqId === reqRef.current && data?.display_name) {
        setDropoff(data.display_name);
      }
    } catch {
      /* keep coordinates as fallback */
    } finally {
      if (reqId === reqRef.current) setLookingUp(false);
    }
  };

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
            <div className="absolute left-[4px] top-[22px] bottom-[22px] w-px bg-gray-300" />

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
            <div className="flex items-center justify-between mb-1">
              <p className="text-[13px] md:text-[14px] font-semibold text-gray-900">
                My Current{" "}
                <span style={{ color: "#8B7500" }}>Location</span>
              </p>
              {lookingUp && (
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="w-3 h-3 border-2 border-gray-300 border-t-[#2D0A53] rounded-full animate-spin" />
                  Finding address…
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mb-2">Tap the map to set your destination</p>
            <div
              className="rounded-xl overflow-hidden border-[2px]"
              style={{ borderColor: selectedPoint ? "#8B7500" : "#2D0A53", height: "200px" }}
            >
              <MiniMap
                selectedPoint={selectedPoint}
                onLocationSelect={handleLocationSelect}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Confirm Ride button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-gray-100 z-[1001]">
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
