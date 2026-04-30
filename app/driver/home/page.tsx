"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DriverHomePage() {
  const router = useRouter();

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* ── Mobile header (hidden on desktop — sidebar handles nav) ── */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="relative w-28 h-12">
          <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
        </div>
        <button className="no-hover-fx p-1" onClick={() => router.push("/driver/home/profile")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>
      </header>

      {/* ── Desktop top-bar (hidden on mobile) ── */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div>
          <p className="text-[24px] font-bold text-gray-900 leading-tight">
            {getGreeting()}, <span style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Adam</span>
          </p>
          <p className="text-[13px] text-gray-400 mt-0.5">Welcome back to your driver dashboard</p>
        </div>
        <button
          className="no-hover-fx flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          onClick={() => router.push("/driver/home/profile")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <span className="text-[13px] font-medium text-gray-700">Ali</span>
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 px-4 pt-5 pb-6 w-full max-w-[480px] mx-auto
                      md:max-w-none md:px-8 md:pt-8 md:pb-8
                      md:grid md:grid-cols-2 md:gap-6
                      lg:grid-cols-3">

        {/* Mobile greeting (hidden on desktop — desktop top-bar has it) */}
        <div className="mb-5 md:hidden">
          <p className="text-[22px] font-bold text-gray-900 leading-tight">
            {getGreeting()},<br />Adam
          </p>
        </div>

        {/* News & Updates banner */}
        <Link
          href="/driver/home/news"
          className="no-hover-fx block rounded-2xl overflow-hidden mb-5 md:mb-0"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2D0A53 60%, #8B7500 100%)" }}
        >
          <div className="flex items-center justify-between px-5 py-6">
            <div className="flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="mt-0.5 shrink-0">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <div>
                <p className="text-white text-[13px] opacity-75 leading-tight">News and Updates</p>
                <p className="text-white text-[17px] font-bold leading-tight mt-0.5">have a new home</p>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        {/* Desktop quick-links (visible md+) */}
        <Link href="/driver/home/offers" className="no-hover-fx hidden md:flex rounded-2xl overflow-hidden items-center justify-between px-5 py-6 bg-white shadow-sm border border-gray-100">
          <div>
            <p className="text-[13px] text-gray-400">Available</p>
            <p className="text-[17px] font-bold text-gray-900">Offers</p>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.8">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          </svg>
        </Link>

        <Link href="/driver/home/planned" className="no-hover-fx hidden lg:flex rounded-2xl overflow-hidden items-center justify-between px-5 py-6 bg-white shadow-sm border border-gray-100">
          <div>
            <p className="text-[13px] text-gray-400">Upcoming</p>
            <p className="text-[17px] font-bold text-gray-900">Planned Rides</p>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.8">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" strokeLinecap="round" strokeWidth="3" />
            <line x1="3" y1="12" x2="3.01" y2="12" strokeLinecap="round" strokeWidth="3" />
            <line x1="3" y1="18" x2="3.01" y2="18" strokeLinecap="round" strokeWidth="3" />
          </svg>
        </Link>

      </div>
    </div>
  );
}
