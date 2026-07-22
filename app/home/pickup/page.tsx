"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect, useCallback, Suspense } from "react";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";

const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

const todayStr = () => new Date().toISOString().split("T")[0];
const nowTimeStr = () => {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 30) * 30, 0, 0);
  return d.toTimeString().slice(0, 5);
};

function PickupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier    = searchParams.get("tier")    ?? "all";
  const service = searchParams.get("service") ?? "";

  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const [pickup, setPickup] = useState(searchParams.get("pickup") ?? "");
  const [dropoff, setDropoff] = useState(searchParams.get("dropoff") ?? "");
  /* Scheduling — same experience as the landing-page widget, prefilled from
     its params when the user came from there */
  const [date,       setDate]       = useState(() => searchParams.get("date") || todayStr());
  const [time,       setTime]       = useState(() => searchParams.get("time") || nowTimeStr());
  const [scheduleError, setScheduleError] = useState("");
  const [passengers, setPassengers] = useState(() => Math.min(8, Math.max(1, parseInt(searchParams.get("passengers") ?? "1", 10) || 1)));
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDropoff, setSelectedDropoff] = useState<{ lat: number; lng: number } | null>(null);
  const [mapMode, setMapMode] = useState<"pickup" | "dropoff">("pickup");
  const [lookingUp, setLookingUp] = useState(false);
  const reqRef = useRef(0);

  const pickupAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const dropoffAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [currentLoc, setCurrentLoc] = useState<{ lat: number; lng: number } | null>(null);

  /* Ask for the rider's current location on mount so pickup suggestions default
     to nearby places (and prefill the pickup field when empty). */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  /* Bias the pickup Autocomplete toward the current location so its dropdown
     suggestions are the nearest places first. */
  const biasPickupToCurrent = useCallback(() => {
    if (!isLoaded || !currentLoc || typeof google === "undefined" || !pickupAutoRef.current) return;
    const c = new google.maps.LatLng(currentLoc.lat, currentLoc.lng);
    const bounds = new google.maps.LatLngBounds();
    /* ~±0.35° ≈ a metro-area box around the rider */
    bounds.extend(new google.maps.LatLng(currentLoc.lat - 0.35, currentLoc.lng - 0.35));
    bounds.extend(new google.maps.LatLng(currentLoc.lat + 0.35, currentLoc.lng + 0.35));
    pickupAutoRef.current.setBounds(bounds);
    void c;
  }, [isLoaded, currentLoc]);

  useEffect(() => {
    biasPickupToCurrent();
    /* If the rider hasn't typed/selected a pickup yet, prefill it with their
       current address so the default pickup IS their current location. */
    if (isLoaded && currentLoc && !pickup && typeof google !== "undefined") {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: currentLoc }, (results, status) => {
        if (status === "OK" && results?.[0]?.formatted_address) {
          setPickup(results[0].formatted_address);
          setSelectedPoint(currentLoc);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, currentLoc, biasPickupToCurrent]);

  const reverseGeocode = (lat: number, lng: number): Promise<string> => {
    return new Promise((resolve) => {
      if (!isLoaded || typeof google === "undefined") {
        resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        return;
      }
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]?.formatted_address) {
          resolve(results[0].formatted_address);
        } else {
          resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      });
    });
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    setLookingUp(true);
    const reqId = ++reqRef.current;

    if (mapMode === "pickup") {
      setSelectedPoint({ lat, lng });
      setPickup(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      const address = await reverseGeocode(lat, lng);
      if (reqId === reqRef.current) {
        setPickup(address);
        setMapMode("dropoff");
      }
    } else {
      setSelectedDropoff({ lat, lng });
      setDropoff(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      const address = await reverseGeocode(lat, lng);
      if (reqId === reqRef.current) setDropoff(address);
    }

    if (reqId === reqRef.current) setLookingUp(false);
  };

  const onPickupPlaceChanged = () => {
    const place = pickupAutoRef.current?.getPlace();
    if (place?.formatted_address) setPickup(place.formatted_address);
    else if (place?.name) setPickup(place.name);
  };

  const onDropoffPlaceChanged = () => {
    const place = dropoffAutoRef.current?.getPlace();
    if (place?.formatted_address) setDropoff(place.formatted_address);
    else if (place?.name) setDropoff(place.name);
  };

  /* "now" → immediate pickup (no date/time carried). "reserve" → scheduled,
     with the reservation lead time enforced (30 min; 45 min for Safe Ride). */
  const handleConfirm = (kind: "now" | "reserve") => {
    setScheduleError("");
    if (kind === "reserve") {
      if (!date || !time) { setScheduleError("Please select a date and time for your reservation."); return; }
      const leadMin = service === "care" ? 45 : 30;
      const when = new Date(`${date}T${time}:00`);
      if (isNaN(when.getTime()) || when.getTime() < Date.now() + leadMin * 60_000) {
        setScheduleError(`Reservations need at least ${leadMin} minutes' notice. For an immediate pickup, use Book Now.`);
        return;
      }
    }
    const schedule: { date?: string; time?: string } = kind === "reserve" ? { date, time } : {};

    if (service === "care") {
      /* Care Ride: skip car selection — go straight to the Care confirm/pay page */
      const params = new URLSearchParams({
        pickup,
        dropoff,
        service: "care",
        tier:    "black",
        car:     "Safe Ride",
        ...schedule,
        passengers: String(passengers),
      });
      if (selectedPoint) {
        params.set("pickupLat", String(selectedPoint.lat));
        params.set("pickupLng", String(selectedPoint.lng));
      }
      router.push(`/home/ride/confirm?${params.toString()}`);
      return;
    }

    /* Per MOVO Team's clarified flow: service pages no longer pre-pick a tier.
       After the address screen, EVERY standard booking lands on available-cars
       — the tier list with live per-trip pricing — where the rider chooses
       exactly once. (Care Ride keeps its dedicated shortcut above.) */
    const mode = searchParams.get("mode");
    const params = new URLSearchParams({
      tier, pickup, dropoff,
      ...schedule,
      passengers: String(passengers),
    });
    if (selectedPoint) {
      params.set("pickupLat", String(selectedPoint.lat));
      params.set("pickupLng", String(selectedPoint.lng));
    }
    if (mode) params.set("mode", mode);
    router.push(`/home/pickup/available-cars?${params.toString()}`);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-white" style={{ fontFamily: "var(--font-body)" }}>

      {/* Map */}
      <div className="relative flex-1">
        <MapComponent
          selectedPoint={selectedPoint}
          selectedDropoff={selectedDropoff}
          onLocationSelect={handleLocationSelect}
        />

        {/* Map mode indicator */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
          {lookingUp ? (
            <div className="bg-white rounded-full px-3 py-1.5 shadow-md text-[12px] text-gray-600 font-medium flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin" />
              Finding address…
            </div>
          ) : (
            <div className="bg-white rounded-full px-3 py-1.5 shadow-md text-[12px] font-semibold flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: mapMode === "pickup" ? "#131936" : "#C6BFB2" }}
              />
              <span style={{ color: mapMode === "pickup" ? "#131936" : "#C6BFB2" }}>
                Tap map to set {mapMode === "pickup" ? "pickup" : "destination"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pickup panel */}
      <div className="shrink-0 bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.10)] px-5 pt-5 pb-8 z-10">
        <p className="text-[13px] font-semibold text-gray-700 mb-4">Set pickup on map or type an address</p>

        <div className="relative flex flex-col gap-3 mb-5">
          <div className="absolute left-[9px] top-[22px] bottom-[22px] w-px bg-gray-300" />

          {/* Pickup */}
          <div className="flex items-center gap-3" onClick={() => setMapMode("pickup")}>
            <div className="w-[10px] h-[10px] rounded-full shrink-0 z-10 transition-colors" style={{ background: mapMode === "pickup" ? "#131936" : "#1a1a2e" }} />
            <div className="flex-1 rounded-lg px-3 py-2.5 border-[1.5px]" style={{ borderColor: "#131936" }}>
              {isLoaded ? (
                <Autocomplete
                  onLoad={(ref) => { pickupAutoRef.current = ref; biasPickupToCurrent(); }}
                  onPlaceChanged={onPickupPlaceChanged}
                >
                  <input
                    type="text"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    placeholder="Enter pickup location"
                    className="w-full bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-[13px]"
                  />
                </Autocomplete>
              ) : (
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Enter pickup location"
                  className="w-full bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-[13px]"
                />
              )}
            </div>
          </div>

          {/* Dropoff */}
          <div className="flex items-center gap-3" onClick={() => setMapMode("dropoff")}>
            <div className="w-[10px] h-[10px] rounded-full shrink-0 z-10 transition-colors" style={{ background: mapMode === "dropoff" ? "#C6BFB2" : "#d1d5db", border: mapMode === "dropoff" ? "none" : "1px solid #9ca3af" }} />
            <div className="flex-1 rounded-lg px-3 py-2.5 bg-gray-100 border border-gray-200">
              {isLoaded ? (
                <Autocomplete
                  onLoad={(ref) => { dropoffAutoRef.current = ref; }}
                  onPlaceChanged={onDropoffPlaceChanged}
                >
                  <input
                    type="text"
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                    placeholder="Destination"
                    className="w-full bg-transparent text-gray-600 placeholder-gray-400 focus:outline-none text-[13px]"
                  />
                </Autocomplete>
              ) : (
                <input
                  type="text"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="Destination"
                  className="w-full bg-transparent text-gray-600 placeholder-gray-400 focus:outline-none text-[13px]"
                />
              )}
            </div>
          </div>
        </div>

        {/* Schedule — date / time / passengers (same as landing widget) */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">Date</label>
            <div className="rounded-lg px-2.5 py-2 bg-gray-100 border border-gray-200">
              <input type="date" value={date} min={todayStr()} onChange={e => setDate(e.target.value)}
                className="w-full bg-transparent text-gray-800 text-[12px] focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">Time</label>
            <div className="rounded-lg px-2.5 py-2 bg-gray-100 border border-gray-200">
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full bg-transparent text-gray-800 text-[12px] focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">Passengers</label>
            <div className="flex items-center justify-between rounded-lg px-2.5 py-2 bg-gray-100 border border-gray-200">
              <button type="button" onClick={() => setPassengers(p => Math.max(1, p - 1))}
                disabled={passengers <= 1}
                className="no-hover-fx w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 text-[13px] font-bold leading-none disabled:opacity-40">−</button>
              <span className="text-[12px] font-semibold text-gray-800">{passengers}</span>
              <button type="button" onClick={() => setPassengers(p => Math.min(8, p + 1))}
                disabled={passengers >= 8}
                className="no-hover-fx w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 text-[13px] font-bold leading-none disabled:opacity-40">+</button>
            </div>
          </div>
        </div>

        {scheduleError && (
          <p className="text-[12px] text-red-500 mb-3">{scheduleError}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!pickup || !dropoff}
            onClick={() => handleConfirm("now")}
            className="py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
          >
            Book Now
          </button>
          <button
            type="button"
            disabled={!pickup || !dropoff}
            onClick={() => handleConfirm("reserve")}
            className="py-3.5 rounded-xl font-bold text-[15px] tracking-wide disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ border: "1.5px solid #131936", color: "#131936", background: "white" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Reserve Ride
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2.5 leading-relaxed">
          For the best experience and guaranteed chauffeur assignment, we recommend reserving your trip at least 30 minutes in advance.
        </p>
      </div>
    </div>
  );
}

export default function PickupPage() {
  return (
    <Suspense>
      <PickupContent />
    </Suspense>
  );
}
