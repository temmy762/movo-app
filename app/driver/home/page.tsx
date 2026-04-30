"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const rideRequest = {
  name: "Nicholas Jackson",
  phone: "+447819484920",
  distance: "10 km (15 min)",
  from: "Memphis, Tennessee (3 P)",
  to: "Nashville, Tennessee (5 P)",
  amount: "$100.00",
  payment: "Master Card",
  timeLeft: "5 mins left",
};

function MapBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#1a1e3c" }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
        <line x1="0" y1="400" x2="400" y2="340" stroke="#252a4a" strokeWidth="16" />
        <line x1="0" y1="400" x2="400" y2="340" stroke="#2e3560" strokeWidth="8" />
        <line x1="160" y1="0" x2="220" y2="700" stroke="#252a4a" strokeWidth="12" />
        <line x1="160" y1="0" x2="220" y2="700" stroke="#2e3560" strokeWidth="5" />
        <line x1="0" y1="550" x2="400" y2="500" stroke="#252a4a" strokeWidth="20" />
        <line x1="0" y1="550" x2="400" y2="500" stroke="#2e3560" strokeWidth="10" />
        <line x1="300" y1="0" x2="350" y2="400" stroke="#252a4a" strokeWidth="10" />
        <line x1="300" y1="0" x2="350" y2="400" stroke="#2e3560" strokeWidth="4" />
        <line x1="0" y1="200" x2="400" y2="180" stroke="#252a4a" strokeWidth="8" />
        <line x1="0" y1="200" x2="400" y2="180" stroke="#2e3560" strokeWidth="3" />
        <line x1="50" y1="0" x2="80" y2="700" stroke="#252a4a" strokeWidth="8" />
        <circle cx="200" cy="360" r="10" fill="#e74c3c" />
        <circle cx="200" cy="360" r="5" fill="white" />
        <circle cx="270" cy="260" r="7" fill="#8B7500" opacity="0.9" />
        <circle cx="130" cy="300" r="7" fill="#8B7500" opacity="0.9" />
        <circle cx="320" cy="420" r="7" fill="#8B7500" opacity="0.9" />
        <text x="100" y="170" fill="#4a5180" fontSize="11" fontFamily="sans-serif">National Trust -</text>
        <text x="70" y="185" fill="#4a5180" fontSize="11" fontFamily="sans-serif">Stonehenge Landscape</text>
        <text x="155" y="290" fill="#4a5180" fontSize="10" fontFamily="sans-serif">Henge</text>
        <text x="70" y="330" fill="#4a5180" fontSize="10" fontFamily="sans-serif">Stonehenge</text>
        <text x="30" y="500" fill="#4a5180" fontSize="10" fontFamily="sans-serif">England</text>
        <text x="30" y="550" fill="#4a5180" fontSize="13" fontFamily="sans-serif" fontWeight="bold">A303</text>
      </svg>
    </div>
  );
}

export default function DriverHomePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [showRideRequest, setShowRideRequest] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  function handleToggleOnline() {
    const next = !isOnline;
    setIsOnline(next);
    if (next) setTimeout(() => setShowRideRequest(true), 1200);
    else { setShowRideRequest(false); setShowDeclineModal(false); }
  }

  return (
    <div className="relative h-full flex flex-col overflow-hidden" style={{ fontFamily: "var(--font-poppins)" }}>

      <MapBackground />

      <div className="relative z-10 flex flex-col h-full">

        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          <button className="no-hover-fx w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <button
              className="no-hover-fx w-8 h-8 bg-white rounded-full flex items-center justify-center shadow"
              onClick={() => router.push("/driver/home/profile")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </button>
            <button
              onClick={handleToggleOnline}
              className="no-hover-fx flex items-center gap-2 px-4 py-1.5 rounded-full shadow font-semibold text-[13px] transition-all duration-300"
              style={isOnline
                ? { background: "linear-gradient(90deg,#2D0A53,#8B7500)", color: "white" }
                : { background: "white", color: "#374151" }}
            >
              {isOnline ? "Online 🇬🇧" : "Offline"}
            </button>
          </div>
        </header>

        {/* Stat chips — offline only */}
        {!isOnline && (
          <div className="flex gap-3 px-4 mt-3">
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
              <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 leading-none">Pre Booked</p>
                <p className="text-[13px] font-bold text-gray-800">12</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
              <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 leading-none">Total Earned</p>
                <p className="text-[13px] font-bold text-gray-800">$200.00</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Ride Request Bottom Sheet */}
        {showRideRequest && (
          <div className="bg-white rounded-t-3xl shadow-2xl px-4 pt-4 pb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[15px] font-bold text-gray-900">Ride Request</p>
              <span className="text-[12px] text-gray-400">{rideRequest.timeLeft}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "#2D0A53" }}>{rideRequest.name}</p>
                  <p className="text-[12px] text-gray-500">📞 {rideRequest.phone}</p>
                </div>
              </div>
              <button className="no-hover-fx w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                onClick={() => router.push("/driver/home/finish/chat")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-gray-700">Trip Route</p>
              <p className="text-[12px] text-gray-400">{rideRequest.distance}</p>
            </div>
            <div className="flex flex-col gap-1.5 mb-3 pl-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#2D0A53] shrink-0" />
                <p className="text-[13px] text-gray-600">{rideRequest.from}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                <p className="text-[13px] text-gray-600">{rideRequest.to}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-gray-700">Payment</p>
              <p className="text-[13px] font-bold" style={{ color: "#8B7500" }}>{rideRequest.amount}</p>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex">
                  <div className="w-5 h-5 rounded-full bg-red-500" />
                  <div className="w-5 h-5 rounded-full bg-yellow-400 -ml-2" />
                </div>
                <p className="text-[13px] font-medium text-gray-700">{rideRequest.payment}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B7500" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="flex gap-3">
              <button type="button"
                onClick={() => setShowDeclineModal(true)}
                className="no-hover-fx flex-1 py-3 rounded-xl font-bold text-[14px] border border-gray-300 text-gray-700">
                Decline
              </button>
              <button type="button"
                onClick={() => { setShowRideRequest(false); router.push("/driver/home/finish"); }}
                className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[14px]"
                style={{ background: "linear-gradient(90deg,#1a1a2e 0%,#2D0A53 50%,#8B7500 100%)" }}>
                Accept
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Decline modal */}
      {showDeclineModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-xl">
            <p className="text-[16px] font-bold text-gray-900 mb-4">Decline Ride</p>
            <div className="relative w-28 h-28 mb-4">
              <Image src="/images/Rectangle 77.png" alt="Decline ride" fill className="object-contain" />
            </div>
            <p className="text-[13px] text-gray-500 text-center mb-5">
              Are you sure you want to decline the ride
            </p>
            <div className="flex gap-3 w-full">
              <button type="button"
                onClick={() => setShowDeclineModal(false)}
                className="no-hover-fx flex-1 py-2.5 rounded-xl font-semibold text-[14px] border border-gray-300 text-gray-700">
                Cancel
              </button>
              <button type="button"
                onClick={() => { setShowDeclineModal(false); setShowRideRequest(false); setIsOnline(false); }}
                className="no-hover-fx flex-1 py-2.5 rounded-xl text-white font-bold text-[14px]"
                style={{ background: "linear-gradient(90deg,#1a1a2e 0%,#2D0A53 50%,#8B7500 100%)" }}>
                Sure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
