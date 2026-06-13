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
  classic:  "Movo Classic",
  premium:  "Movo Premium",
  black:    "Movo Privé Black",
  economy:  "Movo Classic",
  ECONOMY:  "Movo Classic",
  CLASSIC:  "Movo Classic",
  PREMIUM:  "Movo Premium",
  BLACK:    "Movo Privé Black",
};

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

interface CarCard {
  vehicleId: string;
  driverId: string;
  driverName: string;
  tier: string;
  tierLabel: string;
  make: string;
  model: string;
  year: number;
  plate: string;
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
  const tier    = searchParams.get("tier")    ?? "all";
  const pickup  = searchParams.get("pickup")  ?? "";
  const dropoff = searchParams.get("dropoff") ?? "";

  const [cards,   setCards]   = useState<CarCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userLat: number | null = null;
    let userLng: number | null = null;

    const buildCards = (drivers: FleetDriver[]) => {
      const filtered = tier === "all"
        ? drivers
        : drivers.filter((d) => d.vehicle?.tier === tier);

      const built: CarCard[] = filtered
        .filter((d) => d.vehicle !== null)
        .map((d) => {
          const v = d.vehicle!;
          let etaLabel = "Available for scheduling";

          if (d.isOnline && d.lat !== null && d.lng !== null && userLat !== null && userLng !== null) {
            const km = haversineKm(d.lat, d.lng, userLat, userLng);
            const m = Math.round(km * 1000);
            const distStr = m < 1000 ? `${m} m` : `${km.toFixed(1)} km`;
            const estMins = Math.max(1, Math.round((km / 30) * 60));
            etaLabel = `${distStr} · ~${estMins} min away`;
          } else if (d.isOnline) {
            etaLabel = "Online · ETA unavailable";
          }

          return {
            vehicleId: v.id,
            driverId:  d.id,
            driverName: `${d.firstName} ${d.lastName}`,
            tier:      v.tier,
            tierLabel: TIER_LABELS[v.tier] ?? v.tier,
            make:      v.make,
            model:     v.model,
            year:      v.year,
            plate:     v.plate,
            img:       v.photoUrl ?? TIER_IMAGES[v.tier.toLowerCase()] ?? "/images/movo classic.png",
            isOnline:  d.isOnline,
            etaLabel,
          };
        })
        // Sort: online drivers first, then by tier
        .sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return 0;
        });

      setCards(built);
      setLoading(false);
    };

    const load = async (lat: number | null, lng: number | null) => {
      userLat = lat;
      userLng = lng;
      try {
        const res = await fetch("/api/drivers/nearby");
        if (res.ok) {
          const drivers: FleetDriver[] = await res.json();
          buildCards(drivers);
        } else {
          setLoading(false);
        }
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
  }, [tier]);

  const onlineCount = cards.filter((c) => c.isOnline).length;

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[15px] text-gray-500 mb-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <h1 className="text-[22px] font-bold text-gray-900 leading-tight">Available cars for ride</h1>
          {loading ? (
            <p className="text-[13px] text-gray-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-gray-300 border-t-[#2D0A53] rounded-full animate-spin inline-block" />
              Finding available cars…
            </p>
          ) : (
            <p className="text-[13px] text-gray-400 mt-0.5">
              {cards.length} car{cards.length !== 1 ? "s" : ""} found
              {onlineCount > 0 && (
                <span className="ml-2 text-green-600 font-medium">· {onlineCount} available now</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Car list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        <div className="max-w-lg mx-auto space-y-3">

          {loading ? (
            [1, 2, 3].map((i) => (
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
          ) : cards.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3" />
                  <rect x="9" y="11" width="14" height="10" rx="2" />
                  <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-gray-700">No cars in the fleet yet</p>
              <p className="text-[13px] text-gray-400 mt-1">Our team is expanding the fleet in your area.<br />Please check back shortly.</p>
            </div>
          ) : (
            cards.map((car, i) => (
              <div
                key={i}
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 pt-3 pb-3 flex flex-col gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Tier badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "linear-gradient(90deg, #2D0A53, #8B7500)", color: "#fff" }}
                      >
                        {car.tierLabel}
                      </span>
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
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2.5">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <p className="text-[11px] text-gray-500">{car.etaLabel}</p>
                    </div>
                  </div>
                  <div className="relative w-24 h-16 shrink-0">
                    <Image src={car.img} alt={`${car.make} ${car.model}`} fill className="object-contain" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({
                      pickup,
                      dropoff,
                      car: `${car.make} ${car.model}`,
                      vehicleId: car.vehicleId,
                      driverId:  car.driverId,
                    });
                    router.push(`/home/ride?${params.toString()}`);
                  }}
                  className="w-full py-2.5 rounded-lg text-white font-bold text-[13px] tracking-widest"
                  style={{ background: "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)" }}
                >
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

export default function AvailableCarsPage() {
  return (
    <Suspense>
      <AvailableCarsContent />
    </Suspense>
  );
}
