"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { IN_CITY_RIDES_ENABLED, allowedBookingMode } from "@/lib/launchConfig";

const TIER_IMAGES: Record<string, string> = {
  classic: "/images/movo classic.png",
  premium: "/images/movo premium.png",
  black:   "/images/prive black.png",
};

const TIER_LABELS: Record<string, string> = {
  classic: "Standard",
  premium: "Executive",
  black:   "Concierge",
};

const TIER_DESCS: Record<string, string> = {
  classic: "Comfortable everyday rides at great value.",
  premium: "Elevated comfort with premium vehicles.",
  black:   "Unparalleled luxury — your personal concierge.",
};

const FALLBACK_MIN_FARES: Record<string, number> = {
  classic: 18,
  premium: 25,
  black:   35,
  care:    129,
};

const TIERS = ["classic", "premium", "black"] as const;

function AvailableCarsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pickup      = searchParams.get("pickup")  ?? "";
  const dropoff     = searchParams.get("dropoff") ?? "";
  const service     = searchParams.get("service") ?? "";
  const mode        = allowedBookingMode(searchParams.get("mode"));
  const date        = searchParams.get("date")    ?? "";
  const time        = searchParams.get("time")    ?? "";
  const passengers  = searchParams.get("passengers") ?? "";
  const isCare      = service === "care";

  type TierEstimate = { total: number; fare: number; distanceKm: number | null; durationMin: number | null; estimateBasis: string };
  const [loading,       setLoading]       = useState(true);
  const [minFares,      setMinFares]      = useState<Record<string, number>>(FALLBACK_MIN_FARES);
  const [tierEstimates, setTierEstimates] = useState<Record<string, TierEstimate>>({});
  const [booking,       setBooking]       = useState(false);

  /* Instant fare estimates — one per tier as soon as pickup + dropoff are known
     (or hourly mode, which needs no destination). Uses admin-configured rates. */
  useEffect(() => {
    if (!IN_CITY_RIDES_ENABLED || isCare) return;
    if (!pickup || (!dropoff && mode !== "hourly")) return;
    let stale = false;
    const tiers: string[] = [...TIERS];
    Promise.all(
      tiers.map(t => {
        const p = new URLSearchParams({ pickup, dropoff, tier: t });
        if (mode === "hourly") p.set("mode", "hourly");
        return fetch(`/api/bookings/estimate?${p.toString()}`)
          .then(r => (r.ok ? r.json() : null))
          .then(d => (d?.total != null ? ([t, d] as const) : null))
          .catch(() => null);
      })
    ).then(results => {
      if (stale) return;
      const next: Record<string, TierEstimate> = {};
      for (const r of results) {
        if (r) next[r[0]] = { total: r[1].total, fare: r[1].fare, distanceKm: r[1].distanceKm, durationMin: r[1].durationMin, estimateBasis: r[1].estimateBasis };
      }
      setTierEstimates(next);
    });
    return () => { stale = true; };
  }, [pickup, dropoff, mode, isCare]);

  const anyEstimate = tierEstimates.classic ?? tierEstimates.premium ?? tierEstimates.black;

  /* Admin-configured minimum fares — used as a fallback "From $X" price
     until a live per-trip estimate comes back. Rider never sees which/how
     many chauffeurs are online: it's never a pick-your-own-car list, and
     showing headcounts invited exactly that expectation. */
  useEffect(() => {
    fetch("/api/admin/pricing").then(r => r.ok ? r.json() : null).catch(() => null).then((pricing) => {
      if (pricing?.tiers) {
        const fares: Record<string, number> = { ...FALLBACK_MIN_FARES };
        for (const t of pricing.tiers) {
          if (t.tier && t.minFare) fares[t.tier.toLowerCase()] = t.minFare;
        }
        setMinFares(fares);
      }
      setLoading(false);
    });
  }, []);

  /* Book a tier — no vehicle/driver picking. The request broadcasts to every
     eligible chauffeur; whoever accepts first takes the trip. */
  const goToConfirm = (t: string) => {
    setBooking(true);
    const params = new URLSearchParams({ pickup, dropoff, tier: t, car: TIER_LABELS[t] ?? t });
    if (date)       params.set("date", date);
    if (time)       params.set("time", time);
    if (passengers) params.set("passengers", passengers);
    /* Carry the booking mode through — the review screen shows the airport-fee
       toggle only for Airport Transfers and prices hourly charters correctly */
    if (mode)       params.set("mode", mode);
    router.push(`/home/ride/confirm?${params.toString()}`);
  };

  /* Safe Ride never shows the In-City tiers (nor does anything when In-City
     is switched off) — send it to step 1 of its own 4-step flow, pre-filled. */
  const skipTiers = isCare || !IN_CITY_RIDES_ENABLED;
  useEffect(() => {
    if (!skipTiers) return;
    const params = new URLSearchParams({ pickup, dropoff, service: "care", tier: "black" });
    if (date)       params.set("date", date);
    if (time)       params.set("time", time);
    if (passengers) params.set("passengers", passengers);
    router.replace(`/home/pickup?${params.toString()}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (skipTiers) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>

      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <div className="max-w-lg mx-auto">
          <button type="button" onClick={() => router.back()}
            className="flex items-center gap-1 text-[15px] text-gray-500 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <h1 className="text-[22px] font-bold text-gray-900 leading-tight">Choose your ride</h1>
          {loading ? (
            <p className="text-[13px] text-gray-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin inline-block" />
              Checking availability…
            </p>
          ) : (
            <p className="text-[13px] text-gray-400 mt-0.5">3 categories available</p>
          )}
          {anyEstimate?.distanceKm != null && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-[12px] font-semibold text-gray-600">
                {anyEstimate.distanceKm} km · ~{anyEstimate.durationMin} min trip
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tier cards */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        <div className="max-w-lg mx-auto space-y-3">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl px-4 pt-4 pb-4 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                  <div className="w-28 h-20 bg-gray-200 rounded-xl" />
                </div>
                <div className="h-10 bg-gray-200 rounded-xl" />
              </div>
            ))
          ) : (
            TIERS.map(t => {
              return (
                <div key={t}
                  className="rounded-2xl px-4 pt-4 pb-4 flex flex-col gap-3 border border-gray-200 bg-gray-50 cursor-pointer active:scale-[0.99] transition-transform"
                  onClick={() => goToConfirm(t)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[16px] font-bold text-gray-900">{TIER_LABELS[t]}</span>
                      </div>
                      <p className="text-[12px] text-gray-500 leading-snug mb-2">{TIER_DESCS[t]}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        {tierEstimates[t] ? (
                          <span className="text-[12px] text-gray-900 font-bold">
                            ~${tierEstimates[t].total.toFixed(2)}
                            <span className="text-[10px] text-gray-400 font-medium ml-1">est. total</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-600 font-medium">From ${minFares[t]}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="relative w-28 h-20 shrink-0 rounded-xl bg-gray-50 overflow-hidden border border-gray-100">
                        <Image src={TIER_IMAGES[t]} alt={TIER_LABELS[t]} fill className="object-contain p-1.5" unoptimized />
                      </div>
                      <button type="button" disabled={booking}
                        onClick={(e) => { e.stopPropagation(); goToConfirm(t); }}
                        className="no-hover-fx text-[10px] font-bold px-3 py-1.5 rounded-full text-white disabled:opacity-60"
                        style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
                        {booking ? "…" : "Book Now"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

export default function AvailableCarsPage() {
  return (
    <Suspense>
      <AvailableCarsContent />
    </Suspense>
  );
}
