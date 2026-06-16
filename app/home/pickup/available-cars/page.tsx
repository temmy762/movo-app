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

const MIN_FARES: Record<string, number> = {
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

  const [tierInfos, setTierInfos] = useState<Record<string, TierInfo>>({});
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let userLat: number | null = null;
    let userLng: number | null = null;

    const buildTierInfos = (drivers: FleetDriver[]) => {
      const result: Record<string, TierInfo> = {};

      for (const t of TIERS) {
        const tierDrivers = drivers.filter(d => d.vehicle?.tier.toLowerCase() === t);
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
              bestEtaMins = Math.max(1, Math.round((km / 30) * 60));
              bestDriverId = d.id;
              bestVehicleImg = d.vehicle?.photoUrl ?? null;
              bestMake  = d.vehicle?.make ?? "";
              bestModel = d.vehicle?.model ?? "";
            }
          }
        } else if (onlineDrivers.length > 0) {
          const d = onlineDrivers[0];
          bestEtaMins  = null;
          bestDriverId = d.id;
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

        result[t] = {
          tier: t,
          onlineCount: onlineDrivers.length,
          totalCount:  tierDrivers.length,
          bestEtaMins,
          bestDriverId,
          bestVehicleImg,
          bestMake,
          bestModel,
        };
      }

      setTierInfos(result);
      setLoading(false);
    };

    const load = async (lat: number | null, lng: number | null) => {
      userLat = lat;
      userLng = lng;
      try {
        const res = await fetch("/api/drivers/nearby");
        if (res.ok) buildTierInfos(await res.json());
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        ()    => load(null, null),
        { timeout: 8000 }
      );
    } else {
      load(null, null);
    }
  }, []);

  const totalOnline = TIERS.reduce((s, t) => s + (tierInfos[t]?.onlineCount ?? 0), 0);

  const handleBook = (t: string) => {
    const info = tierInfos[t];
    const params = new URLSearchParams({ pickup, dropoff, tier: t });
    if (info?.bestDriverId) params.set("driverId", info.bestDriverId);
    params.set("car", TIER_LABELS[t] ?? t);
    params.set("carImg", TIER_IMAGES[t] ?? "");
    router.push(`/home/ride/confirm?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>

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
              <span className="w-3 h-3 border-2 border-gray-300 border-t-[#2D0A53] rounded-full animate-spin inline-block" />
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
              const isHighlighted = tierParam === t;

              return (
                <div
                  key={t}
                  className="rounded-2xl px-4 pt-4 pb-4 flex flex-col gap-3 border-2 transition-all"
                  style={{
                    background: isHighlighted ? "linear-gradient(135deg, #f5f0ff 0%, #fffbeb 100%)" : "#f9fafb",
                    borderColor: isHighlighted ? "#2D0A53" : "#e5e7eb",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Name + availability */}
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

                      {/* Description */}
                      <p className="text-[12px] text-gray-500 leading-snug mb-2">{TIER_DESCS[t]}</p>

                      {/* ETA + Price row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {isAvailableNow && (
                          <div className="flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span className="text-[11px] text-gray-600 font-medium">
                              {info?.bestEtaMins != null ? `~${info.bestEtaMins} min away` : "Online nearby"}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8B7500" strokeWidth="2.5">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                          </svg>
                          <span className="text-[11px] text-gray-600 font-medium">
                            From ${MIN_FARES[t]}
                          </span>
                        </div>
                        {(info?.totalCount ?? 0) > 0 && (
                          <span className="text-[10px] text-gray-400">{info!.totalCount} vehicle{info!.totalCount !== 1 ? "s" : ""} in fleet</span>
                        )}
                      </div>
                    </div>

                    {/* Car image */}
                    <div className="relative w-28 h-20 shrink-0">
                      <Image src={img} alt={TIER_LABELS[t]} fill className="object-contain" unoptimized />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBook(t)}
                    className="w-full py-3 rounded-xl text-white font-bold text-[13px] tracking-widest"
                    style={{ background: isAvailableNow
                      ? "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)"
                      : "#6b7280"
                    }}
                  >
                    {isAvailableNow ? "BOOK NOW" : "SCHEDULE RIDE"}
                  </button>
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
