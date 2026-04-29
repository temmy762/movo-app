"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Image from "next/image";

const RideMap = dynamic(() => import("./RideMap"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "white", fontSize: "13px" }}>Loading map…</span>
    </div>
  ),
});

function RideTrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pickup = searchParams.get("pickup") || "123 Main Street, USA";
  const dropoff = searchParams.get("dropoff") || "123 Main Street, USA";
  const car = searchParams.get("car") || "Sedan (White)";

  const [view, setView] = useState<"route" | "actions">("route");

  const carImageMap: Record<string, string> = {
    "Movo Classic": "/images/movo classic.png",
    "Movo Premium": "/images/movo premium.png",
    "Movo Privé Black": "/images/prive black.png",
  };
  const carImg = carImageMap[car] ?? "/images/Car.png";

  const dropoffCity = dropoff.split(",").slice(1, 3).join(",").trim() || "";

  return (
    <div
      className="h-screen overflow-hidden flex flex-col bg-gray-900"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* Dark map area */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ height: "44vh", minHeight: "220px" }}>
        {/* "Ride" label */}
        <div className="absolute top-4 left-5 z-[999]">
          <span className="text-white text-[16px] font-semibold drop-shadow-md">Ride</span>
        </div>
        <RideMap />
      </div>

      {/* White bottom panel — overlaps map slightly */}
      <div
        className="relative flex-1 overflow-y-auto bg-white rounded-t-3xl z-10"
        style={{ boxShadow: "0 -8px 24px rgba(0,0,0,0.18)" }}
      >
        <div className="w-full max-w-lg md:max-w-2xl mx-auto px-5 pt-8 pb-28">

          {/* ETA row */}
          <div className="mb-3">
            <p className="text-[30px] md:text-[34px] font-extrabold text-gray-900 leading-none">8 min</p>
            <p className="text-[12px] md:text-[13px] text-gray-400 mt-1">Driver is on the way</p>
          </div>

          {/* Gradient divider */}
          <div
            className="h-[2px] w-full rounded-full mb-4"
            style={{ background: "linear-gradient(90deg, #2D0A53 0%, #8B7500 100%)" }}
          />

          {/* Driver + Car */}
          <div className="flex items-start justify-between mb-4">
            {/* Driver info */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[18px] font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #2D0A53 0%, #8B7500 100%)" }}
              >
                L
              </div>
              <div>
                <p className="text-[14px] md:text-[15px] font-bold text-gray-900">Laura</p>
                <p className="text-[12px] font-semibold" style={{ color: "#f59e0b" }}>★ 4.5</p>
                <p className="text-[11px] text-gray-400">123 Main Street</p>
              </div>
            </div>

            {/* Car */}
            <div className="flex flex-col items-end">
              <div className="w-[110px] h-[60px] rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                <Image
                  src={carImg}
                  alt={car}
                  width={100}
                  height={54}
                  className="object-contain"
                />
              </div>
              <p className="text-[12px] md:text-[13px] font-semibold text-gray-700 mt-1">{car}</p>
              <p className="text-[11px] text-gray-400">4 Seats</p>
            </div>
          </div>

          {/* Message / Call buttons */}
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              className="no-hover-fx flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-gray-200 text-gray-700"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-[13px] font-medium">Message</span>
            </button>
            <button
              type="button"
              className="no-hover-fx flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-gray-200 text-gray-700"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5.06 2 2 0 0 1 3.58 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.91a16 16 0 0 0 6.1 6.1l1.08-1.08a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span className="text-[13px] font-medium">Call</span>
            </button>
          </div>

          {/* View toggle */}
          <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-full">
            <button
              type="button"
              onClick={() => setView("route")}
              className="flex-1 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-200"
              style={
                view === "route"
                  ? { background: "linear-gradient(90deg, #2D0A53, #8B7500)", color: "white" }
                  : { color: "#6b7280" }
              }
            >
              Route
            </button>
            <button
              type="button"
              onClick={() => setView("actions")}
              className="flex-1 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-200"
              style={
                view === "actions"
                  ? { background: "linear-gradient(90deg, #2D0A53, #8B7500)", color: "white" }
                  : { color: "#6b7280" }
              }
            >
              Actions
            </button>
          </div>

          {/* ── Route view ── */}
          {view === "route" && (
            <>
              {/* Address rows */}
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex items-start gap-3">
                  <div
                    className="w-[14px] h-[14px] rounded-full shrink-0 mt-0.5"
                    style={{ background: "#4f46e5" }}
                  />
                  <p className="text-[13px] md:text-[14px] text-gray-700 leading-snug break-words">{pickup}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-[14px] h-[14px] rounded-full bg-red-500 shrink-0 mt-0.5" />
                  <p className="text-[13px] md:text-[14px] text-gray-700 leading-snug break-words">{dropoff}</p>
                </div>
              </div>

            </>
          )}

          {/* ── Actions view ── */}
          {view === "actions" && (
            <>
              {/* Destination + arrival */}
              <div className="flex items-start justify-between p-3 bg-gray-50 rounded-xl mb-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] md:text-[14px] font-semibold text-gray-900 truncate">
                      {dropoff.split(",")[0]}
                    </p>
                    {dropoffCity && (
                      <p className="text-[11px] text-gray-400 truncate">{dropoffCity}</p>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 whitespace-nowrap ml-3 mt-0.5 shrink-0">
                  Arrive at 2:55 PM
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mb-3">
                {[
                  {
                    label: "Change\nDestination",
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    ),
                  },
                  {
                    label: "Add Stop",
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    ),
                  },
                  {
                    label: "Support",
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    ),
                  },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    className="no-hover-fx flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 bg-white"
                  >
                    {btn.icon}
                    <span className="text-[10px] md:text-[11px] font-medium text-gray-700 text-center leading-tight whitespace-pre-line">
                      {btn.label}
                    </span>
                  </button>
                ))}
              </div>

            </>
          )}

        </div>
      </div>

      {/* Fixed action footer */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-gray-100 z-[1001]">
        <div className="w-full max-w-lg md:max-w-2xl mx-auto">
          {view === "route" ? (
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide"
              style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
            >
              Cancel Ride
            </button>
          ) : (
            <button
              type="button"
              className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide bg-red-500"
            >
              Emergency
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RideTrackingPage() {
  return (
    <Suspense>
      <RideTrackingContent />
    </Suspense>
  );
}
