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
  id: string;
  firstName: string;
  lastName: string;
  isOnline: boolean;
  lat: number | null;
  lng: number | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    plate: string;
    tier: string;
    photoUrl: string | null;
  } | null;
}

interface TierInfo {
  tier: string;
  onlineCount: number;
  totalCount: number;
  bestEtaMins: number | null;
  bestDriverId: string | null;
  bestVehicleImg: string | null;
  bestMake: string;
  bestModel: string;
}

interface CarCard {
  vehicleId: string;
  driverId: string;
  driverName: string;
  tier: string;
  make: string;
  model: string;
  year: number;
  img: string;
  isOnline: boolean;
  etaLabel: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function AvailableCarsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierParam = (searchParams.get("tier") ?? "all").toLowerCase();
  const pickup    = searchParams.get("pickup")  ?? "";
  const dropoff   = searchParams.get("dropoff") ?? "";
  const service   = searchParams.get("service") ?? "";
  const isCare    = service === "care";

  const [tierInfos,    setTierInfos]    = useState<Record<string, TierInfo>>({});
  const [carsByTier,   setCarsByTier]   = useState<Record<string, CarCard[]>>({});
  const [loading,      setLoading]      = useState(true);
  const [minFares,     setMinFares]     = useState<Record<string, number>>(FALLBACK_MIN_FARES);
  const [selectedTier,    setSelectedTier]    = useState<string | null>(
    TIERS.includes(tierParam as typeof TIERS[number]) ? tierParam : null
  );
  const [showCareWarning, setShowCareWarning] = useState(false);
  const [pendingTier,     setPendingTier]     = useState<string | null>(null);

  useEffect(() => {
    const buildData = (drivers: FleetDriver[], userLat: number | null, userLng: number | null) => {
      const tierResult: Record<string, TierInfo> = {};
      const carsResult: Record<string, CarCard[]> = {};

      for (const t of TIERS) {
        const tierDrivers   = drivers.filter(d => d.vehicle?.tier.toLowerCase() === t);
        const onlineDrivers = tierDrivers.filter(d => d.isOnline && d.lat !== null && d.lng !== null);

        let bestEtaMins: number | null = null;
        let bestDriverId: string | null = null;
        let bestVehicleImg: string | null = null;
        let bestMake = "";
        let bestModel = "";

        if (onlineDrivers.length > 0 && userLat !== null && userLng !== null) {
          let minKm = Infinity;
          for (const d of onlineDrivers) {
            const km = haversineKm(d.lat!, d.lng!, userLat, userLng);
            if (km < minKm) {
              minKm = km;
              bestEtaMins    = Math.max(1, Math.round((km / 30) * 60));
              bestDriverId   = d.id;
              bestVehicleImg = d.vehicle?.photoUrl ?? null;
              bestMake  = d.vehicle?.make ?? "";
              bestModel = d.vehicle?.model ?? "";
            }
          }
        } else if (onlineDrivers.length > 0) {
          const d = onlineDrivers[0];
          bestDriverId   = d.id;
          bestVehicleImg = d.vehicle?.photoUrl ?? null;
          bestMake  = d.vehicle?.make ?? "";
          bestModel = d.vehicle?.model ?? "";
        } else if (tierDrivers.length > 0) {
          const d = tierDrivers[0];
          bestDriverId   = d.id;
          bestVehicleImg = d.vehicle?.photoUrl ?? null;
          bestMake  = d.vehicle?.make ?? "";
          bestModel = d.vehicle?.model ?? "";
        }

        tierResult[t] = { tier: t, onlineCount: onlineDrivers.length, totalCount: tierDrivers.length, bestEtaMins, bestDriverId, bestVehicleImg, bestMake, bestModel };

        carsResult[t] = tierDrivers
          .filter(d => d.vehicle !== null)
          .map(d => {
            const v = d.vehicle!;
            let etaLabel = "Available for scheduling";
            if (d.isOnline && d.lat !== null && d.lng !== null && userLat !== null && userLng !== null) {
              const km = haversineKm(d.lat, d.lng, userLat, userLng);
              const estMins = Math.max(1, Math.round((km / 30) * 60));
              etaLabel = `~${estMins} min away`;
            } else if (d.isOnline) {
              etaLabel = "Online · ETA unavailable";
            }
            return {
              vehicleId: v.id, driverId: d.id,
              driverName: `${d.firstName} ${d.lastName}`,
              tier: t, make: v.make, model: v.model, year: v.year,
              img: v.photoUrl ?? TIER_IMAGES[t] ?? "/images/movo classic.png",
              isOnline: d.isOnline, etaLabel,
            };
          })
          .sort((a, b) => (a.isOnline === b.isOnline ? 0 : a.isOnline ? -1 : 1));
      }

      setTierInfos(tierResult);
      setCarsByTier(carsResult);
      setLoading(false);
    };

    /* Fetch drivers + pricing immediately — no waiting for geolocation */
    const driversPromise = fetch("/api/drivers/nearby").then(r => r.ok ? r.json() : []).catch(() => []);
    const pricingPromise = fetch("/api/admin/pricing").then(r => r.ok ? r.json() : null).catch(() => null);

    /* Geolocation with a short 1.5s timeout — runs in parallel, don't block UI */
    const geoPromise = new Promise<{ lat: number; lng: number } | null>(resolve => {
      if (!navigator.geolocation) { resolve(null); return; }
      const timer = setTimeout(() => resolve(null), 1500);
      navigator.geolocation.getCurrentPosition(
        pos => { clearTimeout(timer); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        ()   => { clearTimeout(timer); resolve(null); },
        { timeout: 1500, maximumAge: 60000, enableHighAccuracy: false }
      );
    });

    Promise.all([driversPromise, geoPromise, pricingPromise]).then(([drivers, geo, pricing]) => {
      if (pricing?.tiers) {
        const fares: Record<string, number> = { ...FALLBACK_MIN_FARES };
        for (const t of pricing.tiers) {
          if (t.tier && t.minFare) fares[t.tier.toLowerCase()] = t.minFare;
        }
        setMinFares(fares);
      }
      buildData(Array.isArray(drivers) ? drivers : [], geo?.lat ?? null, geo?.lng ?? null);
    });
  }, []);

  const totalOnline = TIERS.reduce((s, t) => s + (tierInfos[t]?.onlineCount ?? 0), 0);

  const handleBookCar = (car: CarCard) => {
    const params = new URLSearchParams({
      pickup, dropoff,
      tier:     car.tier,
      car:      `${car.make} ${car.model}`,
      carImg:   car.img,
      driverId: car.driverId,
    });
    router.push(`/home/ride/confirm?${params.toString()}`);
  };

  const handleTierClick = (t: string) => {
    if (isCare) {
      /* User is in Care flow — warn before letting them exit to a normal ride */
      setPendingTier(t);
      setShowCareWarning(true);
    } else {
      setSelectedTier(t);
    }
  };

  const handleBookCare = () => {
    const params = new URLSearchParams({
      pickup, dropoff,
      service: "care",
      tier:    "black",
      car:     "Movo Care Ride",
    });
    router.push(`/home/ride/confirm?${params.toString()}`);
  };

  /* ── Level 2: individual car cards for selected tier ── */
  if (selectedTier) {
    const cars = carsByTier[selectedTier] ?? [];
    const info = tierInfos[selectedTier];
    return (
      <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <div className="max-w-lg mx-auto">
            <button type="button" onClick={() => setSelectedTier(null)}
              className="flex items-center gap-1 text-[15px] text-gray-500 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              All categories
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-gray-900">{TIER_LABELS[selectedTier]}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
                From ${minFares[selectedTier]}
              </span>
            </div>
            {loading ? (
              <p className="text-[13px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin inline-block" />
                Loading vehicles…
              </p>
            ) : (
              <p className="text-[13px] text-gray-400 mt-0.5">
                {cars.length} vehicle{cars.length !== 1 ? "s" : ""} in fleet
                {(info?.onlineCount ?? 0) > 0 && (
                  <span className="ml-2 text-green-600 font-medium">· {info!.onlineCount} available now</span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
          <div className="max-w-lg mx-auto space-y-3">
            {loading ? (
              [1, 2].map(i => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl px-4 pt-3 pb-3 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="w-24 h-16 bg-gray-200 rounded-xl" />
                  </div>
                  <div className="h-9 bg-gray-200 rounded-lg" />
                </div>
              ))
            ) : cars.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                    <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3" />
                    <rect x="9" y="11" width="14" height="10" rx="2" />
                    <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  </svg>
                </div>
                <p className="text-[15px] font-semibold text-gray-700">No {TIER_LABELS[selectedTier]} vehicles yet</p>
                <p className="text-[13px] text-gray-400 mt-1">Our fleet is growing.<br />Please check another category or try again shortly.</p>
                <button type="button" onClick={() => setSelectedTier(null)}
                  className="mt-4 px-5 py-2 rounded-full text-white text-[13px] font-bold"
                  style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
                  See all categories
                </button>
              </div>
            ) : (
              cars.map((car, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl px-4 pt-3 pb-3 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {car.isOnline ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                            Available Now
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-600">Schedule</span>
                        )}
                      </div>
                      <p className="text-[15px] font-bold text-gray-900">{car.make} {car.model} ({car.year})</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Driver: {car.driverName}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <p className="text-[11px] text-gray-500">{car.etaLabel}</p>
                      </div>
                    </div>
                    <div className="relative w-24 h-16 shrink-0">
                      <Image src={car.img} alt={`${car.make} ${car.model}`} fill className="object-contain" unoptimized />
                    </div>
                  </div>
                  <button type="button" onClick={() => handleBookCar(car)}
                    className="w-full py-2.5 rounded-lg text-white font-bold text-[13px] tracking-widest"
                    style={{ background: "linear-gradient(90deg,#333333 0%,#131936 30%,#C6BFB2 60%)" }}>
                    {car.isOnline ? "BOOK NOW" : "SCHEDULE RIDE"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Level 1: tier category cards ── */
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
                <span className="ml-2 text-green-600 font-medium">· {totalOnline} driver{totalOnline !== 1 ? "s" : ""} online now</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Tier cards */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        <div className="max-w-lg mx-auto space-y-3">
          {/* ── Movo Care Ride card — only for users who explicitly opted into Care (isCare) ──
              Rendering this unconditionally caused users on the regular pickup flow to land
              on the Care checkout page by tapping the most prominent card on this screen. */}
          {isCare && (
            <>
              <div className="mb-1 flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-[#C6BFB2] animate-pulse" />
                <p className="text-[12px] font-semibold text-gray-500">You&apos;re booking a <span className="text-[#131936] font-bold">Movo Care Ride</span></p>
              </div>
              <div
                className="rounded-2xl px-4 pt-4 pb-4 flex flex-col gap-3 border-2 cursor-pointer active:scale-[0.99] transition-transform"
                style={{ borderColor: "#131936", background: "linear-gradient(135deg,#0A0A0F 0%,#131936 60%,#2A3055 100%)" }}
                onClick={handleBookCare}
              >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[16px] font-bold text-white">Movo Care Ride</span>
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
                          <span className="text-[11px] text-white/70 font-medium">From ${minFares["black"]}</span>
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

          {isCare ? (
            <div className="mt-1 mb-2">
              <p className="text-[11px] text-center text-gray-400">Not looking for a Care Ride? Choose a regular category below.</p>
            </div>
          ) : (
            !loading && (
              <div className="mt-1 mb-2">
                <p className="text-[11px] text-center text-gray-400">Or choose a regular category below.</p>
              </div>
            )
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
              const img = info?.bestVehicleImg ?? TIER_IMAGES[t];

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
                        {isAvailableNow && info?.bestEtaMins != null && (
                          <div className="flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span className="text-[11px] text-gray-600 font-medium">~{info.bestEtaMins} min away</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C6BFB2" strokeWidth="2.5">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                          </svg>
                          <span className="text-[11px] text-gray-600 font-medium">From ${minFares[t]}</span>
                        </div>
                        {(info?.totalCount ?? 0) > 0 && (
                          <span className="text-[10px] text-gray-400">{info!.totalCount} vehicle{info!.totalCount !== 1 ? "s" : ""} in fleet</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="relative w-28 h-20 shrink-0">
                        <Image src={img} alt={TIER_LABELS[t]} fill className="object-contain" unoptimized />
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
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
              You came here for a <strong>Movo Care Ride</strong>. Selecting a regular category will exit the Care booking flow.
            </p>
            <div className="flex gap-3 w-full">
              <button type="button"
                onClick={() => setShowCareWarning(false)}
                className="no-hover-fx flex-1 py-2.5 rounded-xl font-semibold text-[13px] border border-gray-300 text-gray-700">
                Stay on Care
              </button>
              <button type="button"
                onClick={() => { setShowCareWarning(false); setSelectedTier(pendingTier); }}
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
