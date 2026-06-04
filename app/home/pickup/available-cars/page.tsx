"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  tier: string;
  driverId: string;
}

interface NearbyDriver {
  id: string;
  firstName: string;
  lastName: string;
  lat: number;
  lng: number;
  vehicle?: Vehicle | null;
}

interface CarCard {
  vehicleId: string;
  driverId: string;
  driverName: string;
  tier: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  specs: string;
  img: string;
  etaLabel: string;
  available: boolean;
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

  const [cards,        setCards]        = useState<CarCard[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [statusMsg,    setStatusMsg]    = useState("Getting your location…");
  const computedRef = useRef(false);

  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  useEffect(() => {
    if (!isLoaded || computedRef.current) return;
    computedRef.current = true;

    const run = async (userLat: number, userLng: number) => {
      setStatusMsg("Finding nearby drivers…");
      let drivers: NearbyDriver[] = [];
      try {
        const res = await fetch("/api/drivers/nearby");
        if (res.ok) drivers = await res.json();
      } catch { /* silent */ }

      const service = new google.maps.DistanceMatrixService();
      const userLatLng = new google.maps.LatLng(userLat, userLng);

      const results: CarCard[] = [];

      // Filter drivers by tier if specified
      const filteredDrivers = tier === "all" 
        ? drivers 
        : drivers.filter((d) => d.vehicle?.tier === tier);

      // If no drivers available, show empty state
      if (filteredDrivers.length === 0) {
        setStatusMsg("No drivers available");
        setCards([]);
        setLoading(false);
        return;
      }

      // Sort by straight-line distance and take 10 closest
      const sorted = [...filteredDrivers].sort(
        (a, b) =>
          haversineKm(a.lat, a.lng, userLat, userLng) -
          haversineKm(b.lat, b.lng, userLat, userLng)
      );
      const nearest = sorted.slice(0, 10);

      try {
        const matrix = await new Promise<google.maps.DistanceMatrixResponse>(
          (resolve, reject) => {
            service.getDistanceMatrix(
              {
                origins: nearest.map(
                  (d) => new google.maps.LatLng(d.lat, d.lng)
                ),
                destinations: [userLatLng],
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.METRIC,
              },
              (result, status) => {
                if (status === "OK" && result) resolve(result);
                else reject(new Error(status));
              }
            );
          }
        );

        nearest.forEach((driver, idx) => {
          if (!driver.vehicle) return;
          
          const el = matrix.rows[idx]?.elements[0];
          let etaLabel = "–";
          
          if (el?.status === "OK") {
            etaLabel = `${el.distance.text} (${el.duration.text} away)`;
          } else {
            const km = haversineKm(driver.lat, driver.lng, userLat, userLng);
            const m = Math.round(km * 1000);
            const distStr = m < 1000 ? `${m} m` : `${km.toFixed(1)} km`;
            const estMins = Math.max(1, Math.round((km / 30) * 60));
            etaLabel = `${distStr} (~${estMins} min away)`;
          }

          results.push({
            vehicleId: driver.vehicle.id,
            driverId: driver.id,
            driverName: `${driver.firstName} ${driver.lastName}`,
            tier: driver.vehicle.tier,
            make: driver.vehicle.make,
            model: driver.vehicle.model,
            year: driver.vehicle.year,
            plate: driver.vehicle.plate,
            specs: `${driver.vehicle.make} ${driver.vehicle.model} | ${driver.vehicle.year}`,
            img: "/images/movo classic.png",
            etaLabel,
            available: true,
          });
        });
      } catch {
        // Fallback to straight-line distance
        nearest.forEach((driver) => {
          if (!driver.vehicle) return;
          
          const km = haversineKm(driver.lat, driver.lng, userLat, userLng);
          const m = Math.round(km * 1000);
          const distStr = m < 1000 ? `${m} m` : `${km.toFixed(1)} km`;
          const estMins = Math.max(1, Math.round((km / 30) * 60));

          results.push({
            vehicleId: driver.vehicle.id,
            driverId: driver.id,
            driverName: `${driver.firstName} ${driver.lastName}`,
            tier: driver.vehicle.tier,
            make: driver.vehicle.make,
            model: driver.vehicle.model,
            year: driver.vehicle.year,
            plate: driver.vehicle.plate,
            specs: `${driver.vehicle.make} ${driver.vehicle.model} | ${driver.vehicle.year}`,
            img: "/images/movo classic.png",
            etaLabel: `${distStr} (~${estMins} min away)`,
            available: true,
          });
        });
      }

      setCards(results);
      setLoading(false);
    };

    /* Get device location first */
    if (!navigator.geolocation) {
      setStatusMsg("Geolocation not supported — showing all cars");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => run(pos.coords.latitude, pos.coords.longitude),
      () => {
        setStatusMsg("Location access denied");
        setLoading(false);
      },
      { timeout: 10000 }
    );
  }, [isLoaded, tier]);

  const availableCount = cards.filter((c) => c.available).length;

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
              {statusMsg}
            </p>
          ) : (
            <p className="text-[13px] text-gray-400 mt-0.5">{availableCount} car{availableCount !== 1 ? "s" : ""} found</p>
          )}
        </div>
      </div>

      {/* Car list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        <div className="max-w-lg mx-auto space-y-3">

          {loading
            ? [1, 2, 3].map((i) => (
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
            : cards.map((car, i) => (
                <div
                  key={i}
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 pt-3 pb-3 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-gray-900">{car.make} {car.model}</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">{car.specs}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Driver: {car.driverName}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2.5">
                          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <p className={`text-[12px] ${car.available ? "text-gray-500" : "text-gray-400 italic"}`}>
                          {car.etaLabel}
                        </p>
                      </div>
                    </div>
                    <div className="relative w-24 h-16 shrink-0">
                      <Image src={car.img} alt={`${car.make} ${car.model}`} fill className="object-contain" />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!car.available}
                    onClick={() => {
                      const params = new URLSearchParams({ 
                        pickup, 
                        dropoff, 
                        car: `${car.make} ${car.model}`,
                        vehicleId: car.vehicleId,
                        driverId: car.driverId,
                      });
                      router.push(`/home/ride?${params.toString()}`);
                    }}
                    className="w-full py-2.5 rounded-lg text-white font-bold text-[13px] tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)" }}
                  >
                    {car.available ? "BOOK NOW" : "UNAVAILABLE"}
                  </button>
                </div>
              ))}

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
