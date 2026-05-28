"use client";

import { useRouter } from "next/navigation";

export default function GpsPolicyPage() {
  const router = useRouter();
  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
            <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-gray-900">GPS Tracking Policy</h1>
      </header>
      <div className="px-4 pt-5 pb-10 w-full max-w-lg mx-auto space-y-4 text-[13px] text-gray-600 leading-relaxed">
        <p className="text-[15px] font-bold text-gray-900">GPS Tracking Policy</p>
        <p>Movo Privé uses GPS location tracking to provide its core ride-hailing service. This policy explains how and when your location is collected.</p>

        <p className="font-semibold text-gray-800">1. When We Track Your Location</p>
        <p>Your location is tracked while you are online and actively using the Movo Privé driver app. Tracking begins when you go online and stops when you go offline.</p>

        <p className="font-semibold text-gray-800">2. How Location Data Is Used</p>
        <p>Location data is used to match you with nearby ride requests, display your position to passengers during an active ride, and calculate route and fare estimates.</p>

        <p className="font-semibold text-gray-800">3. Data Sharing</p>
        <p>Your precise location is shared with a passenger only once you have accepted their ride request, and only for the duration of that ride.</p>

        <p className="font-semibold text-gray-800">4. Data Retention</p>
        <p>Location data from completed trips is retained for 90 days for dispute resolution purposes and then permanently deleted.</p>

        <p className="font-semibold text-gray-800">5. Your Control</p>
        <p>You can stop location tracking at any time by going offline in the app. You may also revoke location permissions from your device settings, though this will prevent you from receiving ride requests.</p>

        <p className="text-[11px] text-gray-400">Last updated: January 2025</p>
      </div>
    </div>
  );
}
