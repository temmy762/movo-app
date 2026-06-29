"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BottomNav from "./components/BottomNav";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const services = [
  { id: 1, title: "In-City Rides",      desc: "Cruise the city in comfort and class.",                          img: "/images/In-city ride.png",    href: "/home/in-city-rides" },
  { id: 2, title: "Airport Transfer",   desc: "From doorstep to departure gate—effortlessly.",                  img: "/images/airport transfer.png", href: "/home/airport-transfer" },
  { id: 3, title: "Hourly Chauffeur",   desc: "Your personal driver, available by the hour.",                   img: "/images/By the hour.png",     href: "/home/by-the-hour" },
  { id: 4, title: "Movo Care Ride",     desc: "We drive you home in your own car. Two chauffeurs, one booking.", img: "/images/In-city ride.png",    href: "/home/care-ride" },
];

export default function HomePage() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const { user } = useCurrentUser();

  return (
    <div className="h-full flex flex-col" style={{ background: "#F5F5F2", fontFamily: "var(--font-body)" }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-20">

        {/* Banner */}
        <div className="relative overflow-hidden h-72">
          <Image
            src="/images/home banner.png"
            alt="Banner"
            fill
            className="object-cover object-top"
            priority
          />
          {/* Overlay gradient */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)" }}
          />
          {/* Greeting */}
          <div className="absolute bottom-[68px] left-4">
            <p className="text-white text-[22px] font-bold drop-shadow">
              {user ? `Hi ${user.firstName}` : "Hi there"}
            </p>
          </div>
          {/* Where to bar */}
          <div className="absolute bottom-4 left-4 right-4">
            {/* Animated gradient border wrapper */}
            <div className="search-bar-border" style={{ boxShadow: "0 0 18px rgba(198,191,178,0.35), 0 4px 20px rgba(0,0,0,0.4)" }}>
              <div
                onClick={() => router.push("/home/pickup")}
                role="button"
                className="flex items-center px-5 py-3 rounded-full gap-3 cursor-pointer no-hover-fx"
                style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
              >
                <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onFocus={() => router.push("/home/pickup")}
                  readOnly
                  placeholder="Where to?"
                  className="flex-1 bg-transparent text-white text-[15px] font-medium placeholder-white/60 focus:outline-none cursor-pointer"
                />
                {destination ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDestination(""); }}
                    className="text-white/60 hover:text-white shrink-0 no-hover-fx"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Our Services */}
        <div className="mt-5">
          <p className="text-[16px] font-bold text-gray-900 mb-3 px-4">Our Services</p>

          {/* Mobile: horizontal snap-scroll row */}
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-1 md:hidden">
            {services.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className="shrink-0 snap-start w-[150px] rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col cursor-pointer"
              >
                <div className="relative w-full h-[100px] bg-gray-50">
                  <Image src={s.img} alt={s.title} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-bold text-gray-900 leading-tight">{s.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: 2-column grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 px-4">
            {services.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className="bg-white rounded-xl p-3 flex items-start gap-2 shadow-sm cursor-pointer"
              >
                <div className="relative w-12 h-12 shrink-0">
                  <Image src={s.img} alt={s.title} fill className="object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 leading-tight">{s.title}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5 leading-snug line-clamp-3">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Promo carousel */}
        <div className="mt-5">
          <p className="text-[16px] font-bold text-gray-900 mb-3 px-4">Explore</p>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-2">
            {/* Card 1 */}
            <div className="relative rounded-xl overflow-hidden h-44 shrink-0 snap-start w-[72%] sm:w-[32%] lg:w-[23%]">
              <Image src="/images/slider card 1.png" alt="Luxury travel" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-2">
                <p className="text-white text-[13px] font-bold leading-tight">Luxury travel</p>
                <p className="text-gray-300 text-[12px] mt-0.5 leading-tight">Private, discreet rides in a class of their own.</p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="relative rounded-xl overflow-hidden h-44 shrink-0 snap-start w-[72%] sm:w-[32%] lg:w-[23%]">
              <Image src="/images/Group 6.png" alt="The ease of travel" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-2">
                <p className="text-white text-[13px] font-bold leading-tight">The ease of travel</p>
                <p className="text-gray-300 text-[12px] mt-0.5 leading-tight">Hourly chauffeur, airport transfer & Care Ride.</p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="relative rounded-xl overflow-hidden h-44 shrink-0 snap-start w-[72%] sm:w-[32%] lg:w-[23%]">
              <Image src="/images/home banner.png" alt="City rides" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-2">
                <p className="text-white text-[13px] font-bold leading-tight">In-City Rides</p>
                <p className="text-gray-300 text-[12px] mt-0.5 leading-tight">Cruise the city in comfort and class.</p>
              </div>
            </div>
            {/* Card 4 */}
            <div className="relative rounded-xl overflow-hidden h-44 shrink-0 snap-start w-[72%] sm:w-[32%] lg:w-[23%]">
              <Image src="/images/slider card 1.png" alt="Airport transfer" fill className="object-cover object-right" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-2">
                <p className="text-white text-[13px] font-bold leading-tight">Airport Transfer</p>
                <p className="text-gray-300 text-[12px] mt-0.5 leading-tight">From doorstep to departure gate—effortlessly.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="h-4" />
      </div>

      <BottomNav />

    </div>
  );
}
