"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const services = [
  {
    id: 1,
    title: "By The Hour",
    desc: "Your next city is just a smooth ride away.",
    img: "/images/By the hour.png",
  },
  {
    id: 2,
    title: "In-City Rides",
    desc: "Cruise the city in comfort and class.",
    img: "/images/In-city ride.png",
  },
  {
    id: 3,
    title: "Party Bus",
    desc: "Your party. Our wheels turn every ride into a celebration.",
    img: "/images/Party bus.png",
  },
  {
    id: 4,
    title: "Airport Transfer",
    desc: "From doorstep to departure gate—effortlessly.",
    img: "/images/airport transfer.png",
  },
];

const navItems = [
  { label: "Dashboard", img: "/images/Home.png", href: "/home", active: true },
  { label: "Rides", img: "/images/EMPTYCar.png", href: "/home/rides", active: false },
  { label: "Help", img: "/images/Help.png", href: "/home/help", active: false },
  { label: "My Profile", img: "/images/Male User.png", href: "/home/profile", active: false },
];

export default function HomePage() {
  const [activeNav, setActiveNav] = useState(0);

  return (
    <div className="h-full flex flex-col bg-gray-100" style={{ fontFamily: "var(--font-poppins)" }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-20">

        {/* Page title */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[13px] text-gray-500 font-medium">Home</p>
        </div>

        {/* Banner */}
        <div className="relative mx-4 rounded-2xl overflow-hidden h-52">
          <Image
            src="/images/home banner.png"
            alt="Banner"
            fill
            className="object-cover"
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
              className="flex items-center px-4 py-2.5 rounded-full"
              style={{ background: "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)" }}
            >
              <svg className="mr-2 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="text-white text-[13px] font-medium">Where to?</span>
            </div>
          </div>
        </div>

        {/* Our Services */}
        <div className="px-4 mt-5">
          <p className="text-[16px] font-bold text-gray-900 mb-3">Our Services</p>
          <div className="grid grid-cols-2 gap-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-xl p-3 flex items-start gap-2 shadow-sm"
              >
                <div className="relative w-12 h-12 shrink-0">
                  <Image src={s.img} alt={s.title} fill className="object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-gray-900 leading-tight">{s.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-snug line-clamp-3">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Promo cards */}
        <div className="px-4 mt-5 grid grid-cols-2 gap-3">
          {/* Card 1 */}
          <div className="relative rounded-xl overflow-hidden h-36 bg-gray-800">
            <Image src="/images/home banner.png" alt="Luxury travel" fill className="object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-3 left-3 right-2">
              <p className="text-white text-[11px] font-bold leading-tight">Luxury travel</p>
              <p className="text-gray-300 text-[9px] mt-0.5 leading-tight">Private, discreet rides in a class of their own.</p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="relative rounded-xl overflow-hidden h-36" style={{ background: "linear-gradient(135deg, #2D0A53, #8B7500)" }}>
            <div className="absolute inset-0 flex flex-col justify-end p-3">
              <p className="text-white text-[11px] font-bold leading-tight">The ease of travel</p>
              <p className="text-gray-200 text-[9px] mt-0.5 leading-tight">Seamless City-to-City, by-the-hour & airport rides.</p>
            </div>
          </div>
        </div>

        <div className="h-4" />
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-50 max-w-screen-sm mx-auto">
        {navItems.map((item, i) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setActiveNav(i)}
            className="flex flex-col items-center gap-0.5 px-3 py-1"
          >
            <div className={`relative w-6 h-6 ${activeNav === i ? "opacity-100" : "opacity-40"}`}>
              <Image src={item.img} alt={item.label} fill className="object-contain" />
            </div>
            <span
              className={`text-[10px] font-medium ${activeNav === i ? "text-purple-800" : "text-gray-400"}`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
