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
    <div className="min-h-full bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1" onClick={() => {}}>
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

      {/* Body */}
      <div className="flex-1 px-4 pt-5 pb-4 flex flex-col max-w-[480px] mx-auto w-full">

        {/* Greeting */}
        <div className="mb-5">
          <p className="text-[22px] font-bold text-gray-900 leading-tight">
            {getGreeting()},<br />Adam
          </p>
        </div>

        {/* News & Updates banner */}
        <Link
          href="/driver/home/news"
          className="no-hover-fx block rounded-2xl overflow-hidden mb-5"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2D0A53 60%, #8B7500 100%)" }}
        >
          <div className="flex items-center justify-between px-4 py-5">
            <div className="flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="mt-0.5 shrink-0">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <div>
                <p className="text-white text-[14px] opacity-80 leading-tight">News and Updates</p>
                <p className="text-white text-[17px] font-bold leading-tight mt-0.5">have a new home</p>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

      </div>
    </div>
  );
}
