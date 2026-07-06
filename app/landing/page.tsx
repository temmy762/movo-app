"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveBookingDraft, getBookingDraft, clearBookingDraft } from "@/lib/booking-draft";
import { useJsApiLoader, Autocomplete as GPlacesAuto } from "@react-google-maps/api";

const GMAPS_KEY  = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const GMAPS_LIBS: ("places")[] = ["places"];

const todayStr = () => new Date().toISOString().split("T")[0];
const nowTimeStr = () => {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 30) * 30, 0, 0);
  return d.toTimeString().slice(0, 5);
};

/* ── Brand tokens ──────────────────────────────────────────────────────────── */
const NAVY  = "#131936";
const GOLD  = "#C6BFB2";
const DARK  = "#0A0A0F";

/* ── Data ───────────────────────────────────────────────────────────────────── */
const SERVICES = [
  { id: "classic",  label: "Movo Classic",     desc: "Everyday city rides, elevated.",          img: "/images/movo classic.png",  from: 18,  href: "/home/pickup?tier=classic" },
  { id: "premium",  label: "Movo Premium",      desc: "More space, more presence.",              img: "/images/movo premium.png",  from: 25,  href: "/home/pickup?tier=premium" },
  { id: "black",    label: "Movo Privé Black",  desc: "Unparalleled luxury at your fingertips.", img: "/images/prive black.png",   from: 35,  href: "/home/pickup?tier=black" },
  { id: "care",     label: "Movo Care Ride",    desc: "We drive you home in your own vehicle.",  img: "/images/movo classic.png",  from: 129, href: "/home/care-ride", badge: "New" },
];

const WHY_ITEMS = [
  { iconKey: "shield",  title: "Vetted Chauffeurs",   desc: "Every driver is background-checked, licensed, and trained to Movo's luxury standard." },
  { iconKey: "pin",     title: "Real-Time Tracking",  desc: "Follow your chauffeur live from dispatch to arrival — no guessing, no waiting." },
  { iconKey: "clock",   title: "On-Time, Every Time", desc: "Precision scheduling so you are never left waiting at the kerb." },
  { iconKey: "card",    title: "Transparent Pricing", desc: "Fare estimated before you book. No surge, no surprises." },
  { iconKey: "car",     title: "Premium Fleet",       desc: "Curated vehicles kept to the highest maintenance and presentation standard." },
  { iconKey: "moon",    title: "24 / 7 Service",      desc: "Your personal driver, available round the clock, every day of the year." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Choose your service",   desc: "Select Classic, Premium, Privé Black, or Movo Care Ride from the booking widget." },
  { step: "02", title: "Enter trip details",    desc: "Set your pickup and destination. Our system calculates the fare instantly." },
  { step: "03", title: "Review & pay securely", desc: "Confirm the price breakdown and pay via card, Apple Pay, or Google Pay." },
  { step: "04", title: "Your chauffeur arrives", desc: "Track your driver live. Sit back and enjoy the ride." },
];

const FLEET = [
  { label: "Movo Classic",    seats: "1–3", bags: 2, img: "/images/movo classic.png",   desc: "Reliable comfort for daily city travel." },
  { label: "Movo Premium",    seats: "1–3", bags: 3, img: "/images/movo premium.png",   desc: "Spacious executive vehicles for every occasion." },
  { label: "Movo Privé Black",seats: "1–3", bags: 3, img: "/images/prive black.png",    desc: "Unrivalled luxury — your personal concierge on wheels." },
];

const FAQS = [
  { q: "What is Movo Care Ride?",         a: "Movo Care Ride sends two professional chauffeurs to your location. The primary driver takes the wheel of your own vehicle and drives you home, while the support driver follows in a Movo car to return both chauffeurs. You keep your car, you arrive safely." },
  { q: "How is pricing calculated?",      a: "Fares are calculated from base fare, distance, duration, and applicable fees (service, GST, airport if relevant). You see the full breakdown before you pay — no surprises." },
  { q: "Can I book for someone else?",    a: "Yes. During booking you can specify the passenger name. The booking confirmation and receipt are sent to your registered account." },
  { q: "What areas do you cover?",        a: "We currently operate across major cities. Live driver availability is shown at the time of booking." },
  { q: "How do I cancel a ride?",         a: "You can cancel a confirmed ride from the tracking screen. Cancellation policies vary by service tier and how close to pickup time the cancellation is made." },
  { q: "Are your drivers insured?",       a: "All Movo chauffeurs hold full commercial driving licences and are covered by Movo's professional liability insurance." },
];

const TESTIMONIALS = [
  { name: "Amara O.",   role: "Corporate Client",      stars: 5, text: "Movo Privé Black is in a league of its own. Impeccable vehicle, professional driver — I won't use anyone else for client meetings." },
  { name: "Daniel T.",  role: "Regular Commuter",      stars: 5, text: "The Care Ride service saved my evening. I could relax knowing my car was being driven safely home." },
  { name: "Sophia R.",  role: "Airport Transfer",      stars: 5, text: "Never missed a flight since switching to Movo. Always early, always professional." },
];

/* ── Sub-components ─────────────────────────────────────────────────────────── */
function StarRow({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#C6BFB2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  );
}

function WhyIcon({ k }: { k: string }) {
  const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: GOLD, strokeWidth: 1.8 };
  if (k === "shield") return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
  if (k === "pin")    return <svg {...p}><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>;
  if (k === "clock")  return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  if (k === "card")   return <svg {...p}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
  if (k === "car")    return <svg {...p}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
  if (k === "moon")   return <svg {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
  return null;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: GOLD }}>{children}</p>
  );
}

function SectionHeading({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <h2 className={`text-[28px] md:text-[38px] font-extrabold leading-tight ${light ? "text-white" : "text-gray-900"}`}>
      {children}
    </h2>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const router = useRouter();
  const [pickup,  setPickup]  = useState("");
  const [dropoff, setDropoff] = useState("");
  const [tab,     setTab]     = useState<"oneway" | "hourly" | "airport" | "care">("oneway");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [widgetError,  setWidgetError]  = useState("");
  const [draftBanner,  setDraftBanner]  = useState<"show" | "none">("none");
  const [bookingBusy,  setBookingBusy]  = useState(false);
  const pickupAutoRef  = useRef<google.maps.places.Autocomplete | null>(null);
  const dropoffAutoRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [date,       setDate]       = useState(todayStr);
  const [time,       setTime]       = useState(nowTimeStr);
  const [passengers, setPassengers] = useState(1);

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: "movo-landing-widget",
    googleMapsApiKey: GMAPS_KEY,
    libraries: GMAPS_LIBS,
  });

  const currentLocRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const draft = getBookingDraft();
    if (draft) setDraftBanner("show");
  }, []);

  /* Capture the visitor's current location so pickup suggestions default to
     nearby places. */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentLocRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        biasPickupToCurrent();
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const biasPickupToCurrent = () => {
    const loc = currentLocRef.current;
    if (!mapsLoaded || !loc || typeof google === "undefined" || !pickupAutoRef.current) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(new google.maps.LatLng(loc.lat - 0.35, loc.lng - 0.35));
    bounds.extend(new google.maps.LatLng(loc.lat + 0.35, loc.lng + 0.35));
    pickupAutoRef.current.setBounds(bounds);
  };

  const restoreDraft = () => {
    const draft = getBookingDraft();
    if (!draft) return;
    setTab(draft.tab);
    setPickup(draft.pickup);
    setDropoff(draft.dropoff);
    setDate(draft.date);
    setTime(draft.time);
    setPassengers(draft.passengers);
    setDraftBanner("none");
  };

  const onPickupPlaceChanged = () => {
    const pl = pickupAutoRef.current?.getPlace();
    if (pl?.formatted_address) setPickup(pl.formatted_address);
    else if (pl?.name) setPickup(pl.name);
  };
  const onDropoffPlaceChanged = () => {
    const pl = dropoffAutoRef.current?.getPlace();
    if (pl?.formatted_address) setDropoff(pl.formatted_address);
    else if (pl?.name) setDropoff(pl.name);
  };

  const handleGetStarted = async () => {
    setWidgetError("");
    if (!pickup.trim())                        { setWidgetError("Please enter a pickup location."); return; }
    if (tab !== "hourly" && !dropoff.trim())   { setWidgetError("Please enter your destination."); return; }
    if (!date)                                 { setWidgetError("Please select a date."); return; }
    if (!time)                                 { setWidgetError("Please select a time."); return; }

    setBookingBusy(true);
    const p = new URLSearchParams();
    p.set("pickup",     pickup);
    if (tab !== "hourly") p.set("dropoff", dropoff);
    p.set("date",       date);
    p.set("time",       time);
    p.set("passengers", String(passengers));

    const tier    = tab === "care" ? "black" : "all";
    const service = tab === "care" ? "care"  : "";
    if (tab === "care")    { p.set("service", "care"); p.set("tier", "black"); }
    else if (tab === "airport") { p.set("tier", "all"); p.set("mode", "airport"); }
    else if (tab === "hourly")  { p.set("tier", "all"); p.set("mode", "hourly"); }
    else                        { p.set("tier", "all"); }

    saveBookingDraft({ pickup, dropoff, date, time, passengers, tab, tier, service });

    const targetUrl = `/home/pickup/available-cars?${p.toString()}`;
    try {
      const res  = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.role === "USER") {
          clearBookingDraft();
          router.push(targetUrl);
          return;
        }
      }
    } catch { /* not logged in */ }
    setBookingBusy(false);
    router.push(`/user/login?redirect=${encodeURIComponent(targetUrl)}`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "var(--font-body, 'DM Sans', sans-serif)", background: "#FAFAF8" }}>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-[999] border-b border-white/10" style={{ background: DARK }}>
        <div className="max-w-7xl mx-auto px-5 md:px-10 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <Image src="/images/logo/logo-horizontal-ivory.svg" alt="Movo Privé" width={110} height={32} priority unoptimized />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#services"  className="text-[13px] font-medium text-white/70 hover:text-white transition-colors">Services</a>
            <a href="#services" className="text-[13px] font-medium text-white/70 hover:text-white transition-colors">For Business</a>
            <Link href="/auth/select" className="text-[13px] font-medium text-white/70 hover:text-white transition-colors">For Chauffeurs</Link>
            <a href="#why-movo"  className="text-[13px] font-medium text-white/70 hover:text-white transition-colors">About Us</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/select" className="hidden md:block text-[13px] font-medium text-white/70 hover:text-white transition-colors">Sign in</Link>
            <Link href="/auth/select"
              className="px-4 py-2 rounded-full text-[13px] font-bold text-white"
              style={{ background: `linear-gradient(135deg,${DARK},${NAVY},#2A3055)` }}>
              Book Now
            </Link>
            <button className="md:hidden text-white" onClick={() => setNavOpen(v => !v)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {navOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
              </svg>
            </button>
          </div>
        </div>
        {navOpen && (
          <div className="md:hidden px-5 pb-4 flex flex-col gap-3 border-t border-white/10" style={{ background: DARK }}>
            <a href="#services" onClick={() => setNavOpen(false)} className="text-[14px] font-medium text-white/70 py-1">Services</a>
            <a href="#services" onClick={() => setNavOpen(false)} className="text-left text-[14px] font-medium text-white/70 py-1">For Business</a>
            <Link href="/auth/select" className="text-[14px] font-medium text-white/70 py-1">For Chauffeurs</Link>
            <a href="#why-movo" onClick={() => setNavOpen(false)} className="text-[14px] font-medium text-white/70 py-1">About Us</a>
            <Link href="/auth/select" className="text-[14px] font-medium text-white/70 py-1">Sign in</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: DARK, minHeight: "92vh" }}>
        <div className="absolute inset-0">
          <Image src="/images/home banner.png" alt="Movo hero" fill className="object-cover object-center opacity-30" priority unoptimized />
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg,${DARK} 0%,${NAVY}88 50%,transparent 100%)` }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 md:px-10 pt-16 sm:pt-20 md:pt-24 pb-10 grid sm:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-center min-h-[92vh]">
          {/* Left copy */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GOLD }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Premium Chauffeur Platform</span>
            </div>
            <h1 className="text-[32px] sm:text-[44px] md:text-[58px] font-extrabold text-white leading-[1.1] mb-5">
              Premium<br />chauffeur<br />services,<br /><span style={{ color: GOLD }}>on your terms.</span>
            </h1>
            <p className="text-white/60 text-[14px] sm:text-[15px] md:text-[17px] leading-relaxed mb-8 max-w-md">
              Professional chauffeurs. Reliable service.<br />Every ride, your way.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-[12px] text-white/60">
                <span style={{ color: GOLD }}>✓</span> Vetted Chauffeurs
              </div>
              <div className="flex items-center gap-2 text-[12px] text-white/60">
                <span style={{ color: GOLD }}>✓</span> On-Time, Every Time
              </div>
              <div className="flex items-center gap-2 text-[12px] text-white/60">
                <span style={{ color: GOLD }}>✓</span> 24/7 Support
              </div>
            </div>
          </div>

          {/* Booking widget */}
          <div className="rounded-3xl overflow-hidden shadow-2xl mt-8 sm:mt-0" style={{ background: "#111827", border: "1px solid rgba(198,191,178,0.15)" }}>
            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {([
                { key: "oneway",  label: "One Way" },
                { key: "hourly",  label: "Hourly" },
                { key: "airport", label: "Airport Transfer" },
                { key: "care",    label: "Safe Ride", badge: "New" },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="flex-1 py-3 text-[11px] font-semibold transition-colors relative"
                  style={{ color: tab === t.key ? "white" : "rgba(255,255,255,0.4)", borderBottom: tab === t.key ? `2px solid ${GOLD}` : "2px solid transparent" }}>
                  {t.label}
                  {"badge" in t && t.badge && (
                    <span className="ml-1 text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: GOLD, color: DARK }}>{t.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Draft restore banner */}
              {draftBanner === "show" && (
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}50` }}>
                  <p className="text-[11px] text-white/70"><span style={{ color: GOLD }} className="font-bold">Saved booking found.</span> Continue where you left off?</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={restoreDraft} className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ background: GOLD, color: DARK }}>Restore</button>
                    <button onClick={() => { clearBookingDraft(); setDraftBanner("none"); }} className="text-[11px] text-white/40 hover:text-white/70">✕</button>
                  </div>
                </div>
              )}
              {tab === "care" && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(198,191,178,0.08)", border: `1px solid ${GOLD}40` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <p className="text-[11px] text-white/60"><span style={{ color: GOLD }} className="font-bold">Movo Safe Ride</span> — We drive you and your vehicle home safely.</p>
                </div>
              )}
              {tab === "hourly" && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(198,191,178,0.08)", border: `1px solid ${GOLD}40` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <p className="text-[11px] text-white/60"><span style={{ color: GOLD }} className="font-bold">Hourly Charter</span> — A dedicated chauffeur at your disposal for as long as you need.</p>
                </div>
              )}

              {/* Pickup */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1.5">Pickup location</label>
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                  {mapsLoaded ? (
                    <GPlacesAuto onLoad={a => { pickupAutoRef.current = a; biasPickupToCurrent(); }} onPlaceChanged={onPickupPlaceChanged}>
                      <input value={pickup} onChange={e => setPickup(e.target.value)}
                        placeholder="Enter pickup location"
                        className="flex-1 bg-transparent text-white text-[13px] placeholder-white/30 focus:outline-none w-full" />
                    </GPlacesAuto>
                  ) : (
                    <input value={pickup} onChange={e => setPickup(e.target.value)}
                      placeholder="Enter pickup location"
                      className="flex-1 bg-transparent text-white text-[13px] placeholder-white/30 focus:outline-none" />
                  )}
                </div>
              </div>

              {/* Dropoff — hidden for hourly (no destination needed) */}
              {tab !== "hourly" && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1.5">Where are we going?</label>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                    {mapsLoaded ? (
                      <GPlacesAuto onLoad={a => { dropoffAutoRef.current = a; }} onPlaceChanged={onDropoffPlaceChanged}>
                        <input value={dropoff} onChange={e => setDropoff(e.target.value)}
                          placeholder="Enter destination"
                          className="flex-1 bg-transparent text-white text-[13px] placeholder-white/30 focus:outline-none w-full" />
                      </GPlacesAuto>
                    ) : (
                      <input value={dropoff} onChange={e => setDropoff(e.target.value)}
                        placeholder="Enter destination"
                        className="flex-1 bg-transparent text-white text-[13px] placeholder-white/30 focus:outline-none" />
                    )}
                  </div>
                </div>
              )}

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1.5">Date</label>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <input type="date" value={date} min={todayStr()} onChange={e => setDate(e.target.value)}
                      className="flex-1 bg-transparent text-white text-[12px] focus:outline-none [color-scheme:dark]" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1.5">Time</label>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)}
                      className="flex-1 bg-transparent text-white text-[12px] focus:outline-none [color-scheme:dark]" />
                  </div>
                </div>
              </div>

              {/* Passengers */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1.5">Passengers</label>
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5 21c0-4 3.1-7 7-7s7 3 7 7"/></svg>
                    <span className="text-[12px] text-white">{passengers} passenger{passengers > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPassengers(p => Math.max(1, p - 1))}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[16px] leading-none transition-opacity"
                      style={{ background: "rgba(255,255,255,0.12)" }} disabled={passengers <= 1}>
                      −
                    </button>
                    <button type="button" onClick={() => setPassengers(p => Math.min(8, p + 1))}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[16px] leading-none transition-opacity"
                      style={{ background: "rgba(255,255,255,0.12)" }} disabled={passengers >= 8}>
                      +
                    </button>
                  </div>
                </div>
              </div>

              {widgetError && (
                <p className="text-[11px] font-semibold text-red-400 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {widgetError}
                </p>
              )}
              <button onClick={handleGetStarted} disabled={bookingBusy}
                className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] tracking-wide mt-1 flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ background: `linear-gradient(135deg,${DARK},${NAVY},#2A3055)` }}>
                {bookingBusy
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Finding your ride…</>
                  : "Book Now →"}
              </button>
              <p className="text-center text-[10px] text-white/30">Sign in or create an account to complete your booking.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW SAFE RIDE WORKS ── */}
      <section className="py-20 px-5 md:px-10" style={{ background: "#111827" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Premium Service</SectionLabel>
            <SectionHeading light>How Safe Ride works</SectionHeading>
            <p className="text-white/50 mt-3 text-[14px]">Two chauffeurs. One mission: get you and your vehicle home safely.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: 1, title: "Book Safe Ride",            desc: "Enter your pickup and destination.",                               icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
              { n: 2, title: "We assign chauffeurs",      desc: "A primary chauffeur drives your vehicle, a support follows.",     icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" },
              { n: 3, title: "Enjoy your ride",           desc: "Relax while we drive you safely to your destination.",             icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
              { n: 4, title: "Trip complete",             desc: "You arrive safely. Your car is parked. We handle the rest.",       icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14" },
            ].map((s, i) => (
              <div key={s.n} className="flex flex-col items-center text-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg,${NAVY},${GOLD}44)`, border: `1px solid ${GOLD}40` }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8"><path d={s.icon}/></svg>
                </div>
                <span className="text-[9px] font-extrabold tracking-widest uppercase" style={{ color: GOLD }}>Step {s.n}</span>
                <p className="text-[12px] font-bold text-white leading-snug">{s.title}</p>
                <p className="text-[11px] text-white/50 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Why Safe Ride card */}
          <div className="mt-14 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(198,191,178,0.12)" }}>
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image */}
              <div className="relative h-56 md:h-auto min-h-[200px]">
                <Image src="/images/home banner.png" alt="Safe Ride" fill className="object-cover object-center opacity-70" unoptimized />
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg,${DARK}99,transparent 70%)` }} />
                <div className="absolute bottom-4 left-4">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: GOLD, color: DARK }}>Safe Ride</span>
                </div>
              </div>
              {/* Content */}
              <div className="p-6 flex flex-col justify-between gap-5">
                <div>
                  <p className="text-[16px] font-bold text-white mb-4">Why Safe Ride?</p>
                  {["Drive your own car", "Professional & discreet", "Perfect for late nights", "Available when you need it most"].map(f => (
                    <div key={f} className="flex items-center gap-2 mb-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      <span className="text-[13px] text-white/70">{f}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-2 p-3 rounded-xl mb-3" style={{ background: "rgba(198,191,178,0.06)", border: `1px solid ${GOLD}30` }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <p className="text-[12px] text-white/60">All chauffeurs are fully vetted and trained.</p>
                  </div>
                  <Link href="/home/pickup?service=care&tier=black"
                    className="w-full py-3 rounded-xl text-white font-bold text-[13px] text-center block"
                    style={{ background: `linear-gradient(135deg,${DARK},${NAVY})` }}>
                    Book Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CHOOSE YOUR LEVEL ── */}
      <section id="services" className="py-20 px-5 md:px-10 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Services</SectionLabel>
            <SectionHeading>Choose your level of service</SectionHeading>
            <p className="text-gray-500 mt-3 text-[14px]">All services include professional chauffeurs and real-time tracking.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SERVICES.map(s => (
              <Link key={s.id} href={s.href}
                className="rounded-2xl p-4 flex flex-col gap-3 border transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 group"
                style={{ border: s.id === "care" ? `2px solid ${NAVY}` : "1px solid #e5e7eb", background: s.id === "care" ? `linear-gradient(135deg,${DARK},${NAVY})` : "white" }}>
                {s.badge && (
                  <span className="self-start text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: GOLD, color: DARK }}>{s.badge}</span>
                )}
                <div className="relative h-16 w-full">
                  <Image src={s.img} alt={s.label} fill className="object-contain" unoptimized />
                </div>
                <p className="text-[13px] font-bold" style={{ color: s.id === "care" ? "white" : "#111827" }}>{s.label}</p>
                <p className="text-[11px] leading-snug" style={{ color: s.id === "care" ? "rgba(255,255,255,0.6)" : "#6b7280" }}>{s.desc}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px]" style={{ color: s.id === "care" ? "rgba(255,255,255,0.5)" : "#9ca3af" }}>From ${s.from}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.id === "care" ? `${GOLD}22` : `${NAVY}11`, color: s.id === "care" ? GOLD : NAVY }}>Book Now</span>
                </div>
              </Link>
            ))}
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-6">Prices are estimates and may vary based on time, distance, and traffic.</p>
        </div>
      </section>

      {/* ── WHY MOVO ── */}
      <section id="why-movo" className="py-20 px-5 md:px-10" style={{ background: "#F5F5F2" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Why Movo Privé</SectionLabel>
            <SectionHeading>The standard for premium<br />chauffeur travel</SectionHeading>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {WHY_ITEMS.map(w => (
              <div key={w.title} className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg,${DARK},${NAVY})` }}>
                  <WhyIcon k={w.iconKey} />
                </div>
                <p className="text-[15px] font-bold text-gray-900">{w.title}</p>
                <p className="text-[13px] text-gray-500 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-5 md:px-10 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Simple Process</SectionLabel>
            <SectionHeading>Book in four steps</SectionHeading>
          </div>
          <div className="flex flex-col gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center font-extrabold text-[16px]"
                  style={{ background: i % 2 === 0 ? `linear-gradient(135deg,${DARK},${NAVY})` : `linear-gradient(135deg,${GOLD},#a89e8e)`, color: "white" }}>
                  {s.step}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-gray-900 mb-1">{s.title}</p>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FLEET SHOWCASE ── */}
      <section className="py-20 px-5 md:px-10" style={{ background: DARK }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Our Fleet</SectionLabel>
            <SectionHeading light>A vehicle for every occasion</SectionHeading>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FLEET.map(f => (
              <div key={f.label} className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="relative h-40 bg-gray-900">
                  <Image src={f.img} alt={f.label} fill className="object-contain p-4" unoptimized />
                </div>
                <div className="p-4">
                  <p className="text-[15px] font-bold text-white mb-1">{f.label}</p>
                  <p className="text-[12px] text-white/50 mb-3">{f.desc}</p>
                  <div className="flex items-center gap-3 text-[11px] text-white/40">
                    <span>👤 {f.seats} passengers</span>
                    <span>🧳 {f.bags} bags</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CORPORATE / BUSINESS ── */}
      <section className="py-20 px-5 md:px-10" style={{ background: "#F5F5F2" }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <SectionLabel>Corporate Travel</SectionLabel>
            <SectionHeading>Business travel,<br />redefined.</SectionHeading>
            <p className="text-gray-500 text-[14px] leading-relaxed mt-4 mb-6">
              Movo Privé partners with organisations to deliver seamless executive travel. Dedicated account management, consolidated invoicing, and priority dispatch — so your team always arrives composed and on time.
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {["Priority driver allocation", "Consolidated monthly invoicing", "Dedicated account manager", "Custom ride policies & spending limits"].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: NAVY }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span className="text-[13px] text-gray-700">{f}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/auth/select" className="inline-block px-6 py-3 rounded-full text-white font-bold text-[13px]"
                style={{ background: `linear-gradient(135deg,${DARK},${NAVY})` }}>
                Book Now
              </Link>
              <Link href="/user/login" className="inline-block px-6 py-3 rounded-full font-bold text-[13px] border"
                style={{ borderColor: NAVY, color: NAVY }}>
                Sign In
              </Link>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden h-72 relative">
            <Image src="/images/home banner.png" alt="Corporate" fill className="object-cover object-center opacity-80" unoptimized />
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg,${DARK}88,transparent)` }} />
          </div>
        </div>
      </section>

      {/* ── AIRPORT TRANSFER HIGHLIGHT ── */}
      <section className="py-20 px-5 md:px-10 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 rounded-3xl overflow-hidden h-64 relative bg-gray-100">
            <Image src="/images/airport transfer.png" alt="Airport" fill className="object-contain p-6" unoptimized />
          </div>
          <div className="order-1 md:order-2">
            <SectionLabel>Airport Transfers</SectionLabel>
            <SectionHeading>Never miss a flight.</SectionHeading>
            <p className="text-gray-500 text-[14px] leading-relaxed mt-4 mb-6">
              Flight-monitored pickups, meet-and-greet arrivals, and door-to-terminal service. Your chauffeur tracks your flight in real time — if it is early or delayed, your driver adapts.
            </p>
            <Link href="/home/pickup?tier=all&mode=airport"
              className="inline-block px-6 py-3 rounded-full text-white font-bold text-[13px]"
              style={{ background: `linear-gradient(135deg,${DARK},${NAVY})` }}>
              Book Now
            </Link>
          </div>
        </div>
      </section>

      {/* ── MOVO CARE HIGHLIGHT ── */}
      <section className="py-20 px-5 md:px-10" style={{ background: `linear-gradient(135deg,${DARK},${NAVY})` }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <SectionLabel>Exclusive Service</SectionLabel>
            <SectionHeading light>Movo Care Ride</SectionHeading>
            <p className="text-white/60 text-[14px] leading-relaxed mt-4 mb-6">
              Had a long evening? Let us take care of everything. Our primary chauffeur drives you home in <em>your own vehicle</em> while a support driver follows to bring them back. You arrive safely. Your car stays with you.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { path: "M19 17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11l5 5v5a2 2 0 0 1-2 2z", label: "Your car, our driver" },
                { path: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", label: "Two-chauffeur team" },
                { path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z", label: "One seamless booking" },
                { path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", label: "Safe & professional" },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8"><path d={f.path}/></svg>
                  <span className="text-[12px] text-white/70 font-medium">{f.label}</span>
                </div>
              ))}
            </div>
            <Link href="/home/care-ride"
              className="inline-block px-6 py-3 rounded-full font-bold text-[13px]"
              style={{ background: GOLD, color: DARK }}>
              Book Now
            </Link>
          </div>
          <div className="rounded-3xl overflow-hidden h-72 relative bg-gray-900 border border-white/10">
            <Image src="/images/prive black.png" alt="Movo Care" fill className="object-contain p-8" unoptimized />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-5 md:px-10 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Client Stories</SectionLabel>
            <SectionHeading>What our clients say</SectionHeading>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-2xl p-5 flex flex-col gap-4 shadow-sm border border-gray-100">
                <StarRow n={t.stars} />
                <p className="text-[13px] text-gray-600 leading-relaxed flex-1">"{t.text}"</p>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">{t.name}</p>
                  <p className="text-[11px] text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-5 md:px-10" style={{ background: "#F5F5F2" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>FAQ</SectionLabel>
            <SectionHeading>Frequently asked questions</SectionHeading>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <button className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  <span className="text-[14px] font-semibold text-gray-900">{f.q}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                    className="shrink-0 transition-transform" style={{ transform: faqOpen === i ? "rotate(180deg)" : "none" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {faqOpen === i && (
                  <div className="px-5 pb-4">
                    <p className="text-[13px] text-gray-500 leading-relaxed">{f.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP DOWNLOAD (Coming Soon) ── */}
      <section className="py-20 px-5 md:px-10" style={{ background: DARK }}>
        <div className="max-w-4xl mx-auto text-center">
          <SectionLabel>Mobile App</SectionLabel>
          <SectionHeading light>Download the Movo app</SectionHeading>
          <p className="text-white/50 text-[14px] mt-3 mb-8">Book, track, and manage your rides from your phone. Coming to iOS and Android soon.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-white/20 cursor-not-allowed opacity-60">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              <span className="text-white font-semibold text-[13px]">App Store — Coming Soon</span>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-white/20 cursor-not-allowed opacity-60">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M3.18 23.76c.3.17.64.17.95 0L16.3 16.5 12.84 13l-9.66 10.76zM21.73 10.3L19.4 8.96l-3.02 2.67 3.02 2.67 2.37-1.37c.67-.38.67-1.28-.04-1.63zM2.13.34C1.88.59 1.75.96 1.75 1.44v21.11c0 .48.13.85.38 1.1L2.23 24l11.83-11.83-.13-.13L2.23.44l-.1-.1zM16.3 7.5L4.13.24c-.31-.18-.65-.17-.95 0L16.3 7.5z"/></svg>
              <span className="text-white font-semibold text-[13px]">Google Play — Coming Soon</span>
            </div>
          </div>
        </div>
      </section>


      {/* ── CTA BANNER ── */}
      <section className="py-16 px-5 md:px-10" style={{ background: `linear-gradient(135deg,${NAVY},${GOLD})` }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-[28px] md:text-[38px] font-extrabold text-white mb-4">Ready for a premium ride?</h2>
          <p className="text-white/80 text-[15px] mb-8">Join thousands of clients who trust Movo Privé for every journey.</p>
          <Link href="/auth/select"
            className="inline-block px-10 py-4 rounded-full font-bold text-[15px]"
            style={{ background: "white", color: NAVY }}>
            Book Now
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: DARK }}>
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-16 grid grid-cols-2 md:grid-cols-5 gap-8 border-b border-white/10">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <Image src="/images/logo/logo-horizontal-ivory.svg" alt="Movo Privé" width={100} height={30} unoptimized />
            </div>
            <p className="text-white/40 text-[12px] leading-relaxed">Premium chauffeur services for every occasion. Professional. Reliable. Yours.</p>
          </div>
          <div>
            <p className="text-white font-semibold text-[13px] mb-4">Services</p>
            <div className="flex flex-col gap-2">
              <Link href="/home/pickup?tier=classic" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">In-City Rides</Link>
              <Link href="/home/pickup?tier=all&mode=airport" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">Airport Transfer</Link>
              <Link href="/home/pickup?tier=all&mode=hourly" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">Hourly Chauffeur</Link>
              <Link href="/home/care-ride" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">Movo Safe Ride</Link>
            </div>
          </div>
          <div>
            <p className="text-white font-semibold text-[13px] mb-4">Company</p>
            <div className="flex flex-col gap-2">
              <a href="#why-movo" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">About Us</a>
              <a href="#services" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">For Business</a>
              <Link href="/auth/select" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">For Chauffeurs</Link>
              <Link href="/contact" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">Contact Us</Link>
            </div>
          </div>
          <div>
            <p className="text-white font-semibold text-[13px] mb-4">Support</p>
            <div className="flex flex-col gap-2">
              <Link href="/user/login" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">Book Now</Link>
              <Link href="/complaints-policy" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">Complaints Policy</Link>
              <Link href="/lost-found-policy" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">Lost &amp; Found</Link>
            </div>
          </div>
          <div>
            <p className="text-white font-semibold text-[13px] mb-4">Legal</p>
            <div className="flex flex-col gap-2">
              <Link href="/privacy-policy" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">Terms &amp; Conditions</Link>
              <Link href="/chauffeur-agreement" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">Chauffeur Agreement</Link>
              <Link href="/data-security" className="text-white/40 text-[12px] hover:text-white/70 transition-colors">Data Security Policy</Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-[11px]">&copy; {new Date().getFullYear()} Movo Privé. All rights reserved.</p>
          <a href="https://www.upwork.com/freelancers/~01570d6e8820d27bcf" target="_blank" rel="noopener noreferrer"
            className="text-white/30 text-[11px] hover:text-white/60 transition-colors">
            Built by <span className="font-semibold">SolvaTree</span>
          </a>
        </div>
      </footer>

    </div>
  );
}
