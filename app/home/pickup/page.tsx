"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, Suspense } from "react";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";

const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

function PickupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") ?? "all";

  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDropoff, setSelectedDropoff] = useState<{ lat: number; lng: number } | null>(null);
  const [mapMode, setMapMode] = useState<"pickup" | "dropoff">("pickup");
  const [lookingUp, setLookingUp] = useState(false);
  const reqRef = useRef(0);

  const pickupAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const dropoffAutoRef = useRef<google.maps.places.Autocomplete | null>(null);

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

  const handleConfirm = () => {
    const params = new URLSearchParams({ tier, pickup, dropoff });
    if (selectedPoint) {
      params.set("pickupLat", String(selectedPoint.lat));
      params.set("pickupLng", String(selectedPoint.lng));
    }
    router.push(`/home/pickup/available-cars?${params.toString()}`);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-white" style={{ fontFamily: "var(--font-poppins)" }}>

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
              <span className="w-3 h-3 border-2 border-gray-300 border-t-[#2D0A53] rounded-full animate-spin" />
              Finding address…
            </div>
          ) : (
            <div className="bg-white rounded-full px-3 py-1.5 shadow-md text-[12px] font-semibold flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: mapMode === "pickup" ? "#2D0A53" : "#8B7500" }}
              />
              <span style={{ color: mapMode === "pickup" ? "#2D0A53" : "#8B7500" }}>
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
            <div className="w-[10px] h-[10px] rounded-full shrink-0 z-10 transition-colors" style={{ background: mapMode === "pickup" ? "#2D0A53" : "#1a1a2e" }} />
            <div className="flex-1 rounded-lg px-3 py-2.5 border-[1.5px]" style={{ borderColor: "#2D0A53" }}>
              {isLoaded ? (
                <Autocomplete
                  onLoad={(ref) => { pickupAutoRef.current = ref; }}
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
            <div className="w-[10px] h-[10px] rounded-full shrink-0 z-10 transition-colors" style={{ background: mapMode === "dropoff" ? "#8B7500" : "#d1d5db", border: mapMode === "dropoff" ? "none" : "1px solid #9ca3af" }} />
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

        <button
          type="button"
          disabled={!pickup || !dropoff}
          onClick={handleConfirm}
          className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-50"
          style={{ background: "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)" }}
        >
          Confirm pickup
        </button>
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
