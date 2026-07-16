"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const TIER_IMAGES: Record<string, string> = {
  classic: "/images/movo classic.png",
  premium: "/images/movo premium.png",
  black:   "/images/prive black.png",
};

const TIER_LABELS: Record<string, string> = {
  classic: "Movo Classic",
  premium: "Movo Premium",
  black:   "Movo Privé Black",
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
};

const TIERS = ["classic", "premium", "black"] as const;

interface FleetDriver {
  isOnline: boolean;
  vehicle: { tier: string } | null;
}

interface TierInfo {
  onlineCount: number;
}

function AvailableCarsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pickup      = searchParams.get("pickup")  ?? "";
  const dropoff     = searchParams.get("dropoff") ?? "";
  const service     = searchParams.get("service") ?? "";
  const mode        = searchParams.get("mode")    ?? "";
  const date        = searchParams.get("date")    ?? "";
  const time        = searchParams.get("time")    ?? "";
  const passengers  = searchParams.get("passengers") ?? "";
  const isCare      = service === "care";

  type TierEstimate = { total: number; fare: number; distanceKm: number | null; durationMin: number | null; estimateBasis: string };
  const [tierInfos,     setTierInfos]     = useState<Record<string, TierInfo>>({});
  const [loading,       setLoading]       = useState(true);
  const [minFares,      setMinFares]      = useState<Record<string, number>>(FALLBACK_MIN_FARES);
  const [tierEstimates, setTierEstimates] = useState<Record<string, TierEstimate>>({});
  const [showCareWarning, setShowCareWarning] = useState(false);
  const [booking,       setBooking]       = useState(false);

  /* Instant fare estimates — one per tier as soon as pickup + dropoff are known
     (or hourly mode, which needs no destination). Uses admin-configured rates. */
  useEffect(() => {
    if (!pickup || (!dropoff && mode !== "hourly")) return;
    let stale = false;
    Promise.all(
      TIERS.map(t => {
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
  }, [pickup, dropoff, mode]);

  const anyEstimate = tierEstimates.classic ?? tierEstimates.premium ?? tierEstimates.black;

  /* Online-driver counts — a trust signal only, never a pick-your-own-car list */
  useEffect(() => {
    const driversPromise = fetch("/api/drivers/nearby").then(r => r.ok ? r.json() : []).catch(() => []);
    const pricingPromise = fetch("/api/admin/pricing").then(r => r.ok ? r.json() : null).catch(() => null);

    Promise.all([driversPromise, pricingPromise]).then(([drivers, pricing]) => {
      if (pricing?.tiers) {
        const fares: Record<string, number> = { ...FALLBACK_MIN_FARES };
        for (const t of pricing.tiers) {
          if (t.tier && t.minFare) fares[t.tier.toLowerCase()] = t.minFare;
        }
        setMinFares(fares);
      }
      const list: FleetDriver[] = Array.isArray(drivers) ? drivers : [];
      const result: Record<string, TierInfo> = {};
      for (const t of TIERS) {
        result[t] = { onlineCount: list.filter(d => d.isOnline && d.vehicle?.tier?.toLowerCase() === t).length };
      }
      setTierInfos(result);
      setLoading(false);
    });
  }, []);

  const totalOnline = TIERS.reduce((s, t) => s + (tierInfos[t]?.onlineCount ?? 0), 0);

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

  const [pendingTier, setPendingTier] = useState<string | null>(null);
  const handleTierClick = (t: string) => {
    if (isCare) { setPendingTier(t); setShowCareWarning(true); }
    else goToConfirm(t);
  };

  const handleBookCare = () => {
    setBooking(true);
    const params = new URLSearchParams({ pickup, dropoff, service: "care", tier: "care", car: "Movo Safe Ride" });
    if (date)       params.set("date", date);
    if (time)       params.set("time", time);
    if (passengers) params.set("passengers", passengers);
    router.push(`/home/ride/confirm?${params.toString()}`);
  };

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
            <p className="text-[13px] text-gray-400 mt-0.5">
              3 categories available
              {totalOnline > 0 && (
                <span className="ml-2 text-green-600 font-medium">· {totalOnline} chauffeur{totalOnline !== 1 ? "s" : ""} online now</span>
              )}
            </p>
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
          {isCare && (
            <>
              <div className="mb-1 flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-[#C6BFB2] animate-pulse" />
                <p className="text-[12px] font-semibold text-gray-500">You&apos;re booking a <span className="text-[#131936] font-bold">Movo Safe Ride</span></p>
              </div>
              <div
                className="rounded-2xl px-4 pt-4 pb-4 flex flex-col gap-3 border-2 cursor-pointer active:scale-[0.99] transition-transform"
                style={{ borderColor: "#131936", background: "linear-gradient(135deg,#0A0A0F 0%,#131936 60%,#2A3055 100%)" }}
                onClick={handleBookCare}
              >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[16px] font-bold text-white">Movo Safe Ride</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">Premium</span>
                      </div>
                      <p className="text-[12px] text-white/70 leading-snug mb-2">We drive you home in your own car — two vetted chauffeurs, one seamless booking.</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C6BFB2" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          <span className="text-[11px] text-white/70 font-medium">2 chauffeurs included</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C6BFB2" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                          {tierEstimates.care ? (
                            <span className="text-[11px] text-white/70 font-medium">~${tierEstimates.care.total.toFixed(2)} est.</span>
                          ) : (
                            <span className="text-[11px] text-white/70 font-medium">From ${minFares["black"]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C6BFB2" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  </div>
              </div>
            </>
          )}

          {isCare && (
            <div className="mt-1 mb-2">
              <p className="text-[11px] text-center text-gray-400">Not looking for a Safe Ride? Choose a regular category below.</p>
            </div>
          )}

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
              const info = tierInfos[t];
              const isAvailableNow = (info?.onlineCount ?? 0) > 0;

              return (
                <div key={t}
                  className="rounded-2xl px-4 pt-4 pb-4 flex flex-col gap-3 border border-gray-200 bg-gray-50 cursor-pointer active:scale-[0.99] transition-transform"
                  onClick={() => handleTierClick(t)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[16px] font-bold text-gray-900">{TIER_LABELS[t]}</span>
                        {isAvailableNow ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                            {info!.onlineCount} available now
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            Schedule only
                          </span>
                        )}
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
                        onClick={(e) => { e.stopPropagation(); handleTierClick(t); }}
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

      {/* Care flow exit warning */}
      {showCareWarning && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowCareWarning(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg,#131936,#2A3055)" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <p className="text-[16px] font-bold text-gray-900 mb-1">Switch to Regular Ride?</p>
            <p className="text-[12px] text-gray-500 text-center mb-5">
              You came here for a <strong>Movo Safe Ride</strong>. Selecting a regular category will exit the Safe Ride booking flow.
            </p>
            <div className="flex gap-3 w-full">
              <button type="button"
                onClick={() => setShowCareWarning(false)}
                className="no-hover-fx flex-1 py-2.5 rounded-xl font-semibold text-[13px] border border-gray-300 text-gray-700">
                Stay on Safe Ride
              </button>
              <button type="button"
                onClick={() => { setShowCareWarning(false); if (pendingTier) goToConfirm(pendingTier); }}
                className="no-hover-fx flex-1 py-2.5 rounded-xl text-white font-bold text-[13px]"
                style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
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
