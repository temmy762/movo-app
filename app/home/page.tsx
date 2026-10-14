"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BottomNav from "./components/BottomNav";
import AddressInput from "./components/AddressInput";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { IN_CITY_RIDES_ENABLED, AIRPORT_TRANSFER_ENABLED, HOURLY_CHARTER_ENABLED } from "@/lib/launchConfig";

/* Each card goes straight into its own booking flow:
   City Rides → pickup & destination → Standard / Executive / Concierge
   Safe Ride  → pickup & destination → your vehicle → checkout (no tiers)
   Launch scope (lib/launchConfig.ts): switched-off services are hidden. */
const ALL_SERVICES = [
  { id: "city",    title: "City Rides",       desc: "Rides for everyday trips",                 cta: "Book a ride",      img: "/images/tiers/standard.png",   href: "/home/pickup",                        enabled: IN_CITY_RIDES_ENABLED },
  { id: "care",    title: "Safe Ride",        desc: "A chauffeur drives you in your own car.",  cta: "Book a chauffeur", img: "/images/tiers/safe-ride.png",  href: "/home/pickup?service=care&tier=black", enabled: true },
  { id: "airport", title: "Airport Transfer", desc: "From doorstep to departure gate.",         cta: "Book a transfer",  img: "/images/airport transfer.png", href: "/home/pickup?mode=airport",            enabled: AIRPORT_TRANSFER_ENABLED },
  { id: "hourly",  title: "Hourly Chauffeur", desc: "Your personal driver, by the hour.",       cta: "Book by the hour", img: "/images/By the hour.png",      href: "/home/pickup?mode=hourly",             enabled: HOURLY_CHARTER_ENABLED },
];
const services = ALL_SERVICES.filter((s) => s.enabled);

/* Destination typed on the home screen is carried into the chosen flow */
function withDestination(href: string, dropoff: string) {
  if (!dropoff) return href;
  return `${href}${href.includes("?") ? "&" : "?"}dropoff=${encodeURIComponent(dropoff)}`;
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* Desktop header links — mobile uses the bottom bar */
const DESKTOP_NAV = [
  { label: "Home",  href: "/home",       active: true },
  { label: "Rides", href: "/home/rides", active: false },
  { label: "Help",  href: "/home/help",  active: false },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [destination, setDestination] = useState("");
  const [choosing, setChoosing] = useState(false);

  /* "Where are you heading?" — with one service, go straight in; otherwise
     let the customer pick, keeping the address they entered */
  const submitDestination = (address = destination) => {
    const dropoff = address.trim();
    if (services.length === 1) { router.push(withDestination(services[0].href, dropoff)); return; }
    setDestination(dropoff);
    setChoosing(true);
  };

  const searchBar = (
    <div className="flex items-center gap-3 pl-5 pr-2 py-2 md:py-2.5 rounded-full shadow-lg"
      style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
      <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <div className="flex-1 min-w-0">
        <AddressInput
          value={destination}
          onChange={setDestination}
          onSelect={submitDestination}
          placeholder="Where are you heading?"
          className="w-full bg-transparent text-white text-[15px] md:text-[16px] font-medium placeholder-white/70 focus:outline-none py-1.5"
        />
      </div>
      <button type="button" onClick={() => submitDestination()} aria-label="Continue"
        className="no-hover-fx w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0 text-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col" style={{ background: "#F5F5F2", fontFamily: "var(--font-body)" }}>
      <div className="flex-1 overflow-y-auto pb-24 md:pb-16">

        {/* Header — desktop adds the Home / Rides / Help links (no bottom bar there) */}
        <div className="bg-white md:border-b md:border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 md:max-w-6xl md:mx-auto md:px-8 md:py-4">
            <Image src="/images/logo/logo-horizontal-navy.svg" alt="MOVO" width={110} height={28} className="h-7 md:h-8 w-auto" priority />
            <div className="flex items-center gap-8">
              <nav className="hidden md:flex items-center gap-7">
                {DESKTOP_NAV.map((n) => (
                  <Link key={n.label} href={n.href}
                    className={`no-hover-fx text-[14px] font-semibold pb-1 border-b-2 ${n.active ? "text-[#131936] border-[#131936]" : "text-gray-500 border-transparent hover:text-[#131936]"}`}>
                    {n.label}
                  </Link>
                ))}
              </nav>
              <Link href="/home/profile" aria-label="Profile"
                className="no-hover-fx w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#131936"><circle cx="12" cy="8" r="4.5" /><path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" /></svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Banner + greeting (desktop: wide hero with the search inside) */}
        <div className="relative overflow-hidden h-48 md:h-[380px]">
          <Image src="/images/home banner.png" alt="" fill className="object-cover object-top md:object-[center_30%]" priority />
          <div className="absolute inset-0 md:hidden" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)" }} />
          <div className="absolute inset-0 hidden md:block" style={{ background: "linear-gradient(90deg, rgba(10,10,15,0.85) 0%, rgba(19,25,54,0.6) 45%, rgba(0,0,0,0.05) 100%)" }} />
          <p className="absolute bottom-4 left-4 text-white text-[24px] font-bold drop-shadow md:hidden">
            {user ? `Hi ${user.firstName}` : "Hi there"}
          </p>
          <div className="hidden md:flex absolute inset-0 items-center">
            <div className="w-full max-w-6xl mx-auto px-8">
              <div className="max-w-xl">
                <p className="text-white text-[40px] font-bold leading-tight">{user ? `Hi ${user.firstName}` : "Hi there"}</p>
                <p className="text-white/75 text-[16px] mt-2 mb-6">Ride with us, or let us drive your car.</p>
                {searchBar}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 md:max-w-6xl md:px-8">
          {/* Where are you heading? (mobile; desktop has it in the hero) */}
          <div className="-mt-1 pt-3 md:hidden">{searchBar}</div>

          {/* Choose your service */}
          <h2 className="text-[22px] md:text-[28px] font-bold text-gray-900 mt-6 md:mt-12 leading-tight">Choose your service</h2>
          <p className="text-[14px] md:text-[15px] text-gray-500 mt-1">Ride with us, or let us drive your car.</p>

          <div className={`flex flex-col gap-3 mt-4 md:grid md:gap-5 md:mt-6 ${services.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1 md:max-w-xl"}`}>
            {services.map((s) => (
              <Link key={s.id} href={s.href}
                className="no-hover-fx bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 md:px-7 md:py-7 flex items-center gap-4 md:gap-6 active:scale-[0.99] transition md:hover:shadow-md md:hover:border-gray-200">
                <div className="relative w-[96px] h-[64px] md:w-[150px] md:h-[96px] shrink-0">
                  <Image src={s.img} alt="" fill sizes="(min-width: 768px) 150px, 96px" className="object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[17px] md:text-[20px] font-bold text-gray-900 leading-tight">{s.title}</p>
                  <p className="text-[13px] md:text-[14px] text-gray-500 mt-0.5 md:mt-1 leading-snug">{s.desc}</p>
                  <span className="inline-flex items-center gap-1.5 mt-2 md:mt-3 text-[14px] md:text-[15px] font-semibold" style={{ color: "#131936" }}>
                    {s.cta} <Arrow />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="md:grid md:grid-cols-3 md:gap-5 md:mt-8">
            {/* Your next trip, made simple */}
            <div className="mt-5 md:mt-0 md:col-span-2 rounded-2xl px-4 py-4 md:px-7 md:py-6" style={{ background: "#ECEEF5" }}>
              <p className="text-[17px] md:text-[19px] font-bold text-gray-900">Your next trip, made simple.</p>
              <div className="grid grid-cols-2 gap-3 mt-3 md:mt-4">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <span className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>
                  </span>
                  <p className="text-[13px] md:text-[14px] text-gray-700 leading-snug">Review your fare before you book</p>
                </div>
                <div className="flex items-center gap-2.5 md:gap-3 border-l border-gray-300/70 pl-3 md:pl-5">
                  <span className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  </span>
                  <p className="text-[13px] md:text-[14px] text-gray-700 leading-snug">Live trip tracking</p>
                </div>
              </div>
            </div>

            {/* Need help choosing? — a row on mobile, a card on desktop */}
            <Link href="/home/help?topic=choosing"
              className="no-hover-fx flex items-center justify-between mt-4 py-3 md:mt-0 md:px-7 md:py-6 md:bg-white md:rounded-2xl md:border md:border-gray-100 md:shadow-sm md:hover:shadow-md transition"
              style={{ color: "#131936" }}>
              <span>
                <span className="block text-[15px] md:text-[17px] font-semibold md:font-bold">Need help choosing?</span>
                <span className="hidden md:block text-[13px] text-gray-500 font-normal mt-1">Compare City Rides and Safe Ride</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Service choice for a destination typed on the home screen */}
      {choosing && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 md:p-6" onClick={() => setChoosing(false)}>
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg p-5 pb-8 md:p-7" onClick={(e) => e.stopPropagation()}>
            <p className="text-[17px] font-bold text-gray-900">How would you like to travel?</p>
            {destination && <p className="text-[12px] text-gray-500 mt-1 break-words">To {destination}</p>}
            <div className="flex flex-col gap-3 mt-4">
              {services.map((s) => (
                <button key={s.id} type="button" onClick={() => router.push(withDestination(s.href, destination))}
                  className="no-hover-fx text-left rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-4">
                  <div className="relative w-[72px] h-[48px] shrink-0">
                    <Image src={s.img} alt="" fill sizes="72px" className="object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-gray-900">{s.title}</p>
                    <p className="text-[12px] text-gray-500">{s.desc}</p>
                  </div>
                  <Arrow className="text-gray-400 shrink-0" />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setChoosing(false)} className="no-hover-fx w-full mt-4 text-[13px] text-gray-400">Cancel</button>
          </div>
        </div>
      )}

      {/* Desktop uses the header links instead of the bottom bar */}
      <div className="md:hidden"><BottomNav /></div>
    </div>
  );
}
