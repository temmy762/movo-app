"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];
const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832 };

const POLL_INTERVAL_MS = 15000;

const CAR_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="16" fill="#1a1a2e"/>
    <path d="M7 19H5v-6l2-5h14l2 5v6h-2m0 0a2 2 0 01-4 0m4 0H9m0 0a2 2 0 01-4 0M9 13h10"
      stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
);

const PIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
    <circle cx="17" cy="17" r="17" fill="#131936"/>
    <circle cx="17" cy="17" r="7" fill="white"/>
    <polygon points="9,31 25,31 17,44" fill="#131936"/>
  </svg>`
);

const DROPOFF_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
    <circle cx="17" cy="17" r="17" fill="#C6BFB2"/>
    <circle cx="17" cy="17" r="7" fill="white"/>
    <polygon points="9,31 25,31 17,44" fill="#C6BFB2"/>
  </svg>`
);

const MAP_STYLES = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

interface Props {
  selectedPoint?: { lat: number; lng: number } | null;
  selectedDropoff?: { lat: number; lng: number } | null;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export default function MapComponent({ selectedPoint, selectedDropoff, onLocationSelect }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<{ id: string; lat: number; lng: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didPanToUser = useRef(false);

  /* Pan to user location once on load */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        if (mapRef.current && !didPanToUser.current) {
          didPanToUser.current = true;
          mapRef.current.panTo(loc);
        }
      },
      () => {}
    );
  }, []);

  /* When map loads after geolocation already returned, pan now */
  useEffect(() => {
    if (mapRef.current && userLoc && !didPanToUser.current) {
      didPanToUser.current = true;
      mapRef.current.panTo(userLoc);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  /* Pan to selected pin WITHOUT resetting zoom */
  useEffect(() => {
    if (mapRef.current && selectedPoint) {
      mapRef.current.panTo(selectedPoint);
    }
  }, [selectedPoint]);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await fetch("/api/drivers/nearby");
        if (res.ok) {
          const data = await res.json();
          setNearbyDrivers(data);
        }
      } catch {
        // silent — map still works without live drivers
      }
    };

    fetchDrivers();
    intervalRef.current = setInterval(fetchDrivers, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (onLocationSelect && e.latLng) {
        onLocationSelect(e.latLng.lat(), e.latLng.lng());
      }
    },
    [onLocationSelect]
  );

  if (!API_KEY || loadError) {
    return (
      <div style={{ width: "100%", height: "100%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
        <span style={{ fontSize: "13px", color: "#6b7280" }}>Google Maps is not available. Please check the API key, billing, and allowed website referrers.</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ width: "100%", height: "100%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "13px", color: "#6b7280" }}>Loading map…</span>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      onClick={onMapClick}
      onLoad={(map) => {
        mapRef.current = map;
        /* Set initial position imperatively — NOT via controlled props */
        map.setCenter(userLoc ?? DEFAULT_CENTER);
        map.setZoom(14);
        if (userLoc) didPanToUser.current = true;
      }}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        gestureHandling: "greedy",
        styles: MAP_STYLES,
      }}
    >
      {/* User location dot */}
      {userLoc && (
        <Marker
          position={userLoc}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#4f46e5",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2.5,
          }}
          title="Your location"
          zIndex={10}
        />
      )}

      {/* Nearby car markers — live driver positions */}
      {nearbyDrivers.map((driver) => (
        <Marker
          key={driver.id}
          position={{ lat: driver.lat, lng: driver.lng }}
          icon={{
            url: `data:image/svg+xml;charset=UTF-8,${CAR_SVG}`,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          }}
        />
      ))}

      {/* Selected pickup pin */}
      {selectedPoint && (
        <Marker
          position={selectedPoint}
          icon={{
            url: `data:image/svg+xml;charset=UTF-8,${PIN_SVG}`,
            scaledSize: new google.maps.Size(34, 44),
            anchor: new google.maps.Point(17, 44),
          }}
          zIndex={20}
        />
      )}

      {/* Selected dropoff pin */}
      {selectedDropoff && (
        <Marker
          position={selectedDropoff}
          icon={{
            url: `data:image/svg+xml;charset=UTF-8,${DROPOFF_SVG}`,
            scaledSize: new google.maps.Size(34, 44),
            anchor: new google.maps.Point(17, 44),
          }}
          zIndex={20}
        />
      )}
    </GoogleMap>
  );
}
