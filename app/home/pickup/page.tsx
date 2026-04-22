"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

export default function RidesPage() {
  const router = useRouter();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("England");
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const reqRef = useRef(0);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedPoint({ lat, lng });
    setLookingUp(true);
    const reqId = ++reqRef.current;
    // Temporary value while geocoding resolves
    setPickup(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (reqId === reqRef.current && data?.display_name) {
        setPickup(data.display_name);
      }
    } catch {
      /* keep coordinates as fallback */
    } finally {
      if (reqId === reqRef.current) setLookingUp(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-white" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Map — fills all remaining space above panel */}
      <div className="relative flex-1">
        <MapComponent selectedPoint={selectedPoint} onLocationSelect={handleLocationSelect} />
        {lookingUp && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-full px-3 py-1.5 shadow-md text-[12px] text-gray-600 font-medium flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-gray-300 border-t-[#2D0A53] rounded-full animate-spin" />
            Finding address…
          </div>
        )}
      </div>

      {/* Pickup panel */}
      <div className="shrink-0 bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.10)] px-5 pt-5 pb-8 z-10">
        <p className="text-[13px] font-semibold text-gray-700 mb-4">Set pickup on map</p>

        {/* Inputs */}
        <div className="relative flex flex-col gap-3 mb-5">
          {/* Vertical connector line */}
          <div className="absolute left-[9px] top-[22px] bottom-[22px] w-px bg-gray-300" />

          {/* Pickup */}
          <div className="flex items-center gap-3">
            <div className="w-[10px] h-[10px] rounded-full bg-gray-900 shrink-0 z-10" />
            <div
              className="flex-1 rounded-lg px-3 py-2.5 border-[1.5px] text-[13px]"
              style={{ borderColor: "#2D0A53" }}
            >
              <input
                type="text"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                placeholder="Enter Location"
                className="w-full bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-[13px]"
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
                placeholder="Destination"
                className="w-full bg-transparent text-gray-600 placeholder-gray-400 focus:outline-none text-[13px]"
              />
            </div>
          </div>
        </div>

        {/* Confirm button */}
        <button
          type="button"
          disabled={!pickup}
          onClick={() => router.push("/home/pickup/available-cars?tier=all")}
          className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide"
          style={{ background: "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)" }}
        >
          Confirm pickup
        </button>
      </div>
    </div>
  );
}
