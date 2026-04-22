"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BottomNav from "./components/BottomNav";

const services = [
  { id: 1, title: "By The Hour", desc: "Your next city is just a smooth ride away.", img: "/images/By the hour.png", href: "/home/by-the-hour" },
  { id: 2, title: "In-City Rides", desc: "Cruise the city in comfort and class.", img: "/images/In-city ride.png", href: "/home/in-city-rides" },
  { id: 3, title: "Party Bus", desc: "Your party. Our wheels turn every ride into a celebration.", img: "/images/Party bus.png", href: "/home/party-bus" },
  { id: 4, title: "Airport Transfer", desc: "From doorstep to departure gate—effortlessly.", img: "/images/airport transfer.png", href: "/home/airport-transfer" },
];

export default function HomePage() {
  const router = useRouter();
  const [destination, setDestination] = useState("");

  return (
    <div className="h-full flex flex-col bg-gray-100" style={{ fontFamily: "var(--font-poppins)" }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-20">

        {/* Banner */}
        <div className="relative overflow-hidden h-72">
          <Image
            src="/images/home banner.png"
            alt="Banner"
            fill
            className="object-cover object-bottom"
            priority
          />
          {/* Overlay gradient */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)" }}
          />
          {/* Greeting */}
          <div className="absolute bottom-14 left-4">
            <p className="text-white text-[22px] font-bold drop-shadow">Hi Laura</p>
          </div>
          {/* Where to bar */}
          <div className="absolute bottom-3 left-4 right-4">
            <div
              onClick={() => router.push("/home/pickup")}
              role="button"
              className="flex items-center px-4 py-2.5 rounded-full gap-2 cursor-pointer"
              style={{ background: "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)" }}
            >
              <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onFocus={() => router.push("/home/pickup")}
                readOnly
                placeholder="Where to?"
                className="flex-1 bg-transparent text-white text-[13px] font-medium placeholder-white/70 focus:outline-none cursor-pointer"
              />
              {destination && (
                <button
                  type="button"
                  onClick={() => setDestination("")}
                  className="text-white/70 hover:text-white shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Our Services */}
        <div className="px-4 mt-5">
          <p className="text-[16px] font-bold text-gray-900 mb-3">Our Services</p>
          <div className="grid grid-cols-2 gap-3">
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
                <p className="text-gray-300 text-[12px] mt-0.5 leading-tight">Seamless City-to-City, by-the-hour & airport transfer.</p>
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
