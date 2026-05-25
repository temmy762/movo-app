"use client";

import { useCallback, useEffect, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];
const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832 };

const CAR_POSITIONS = [
  { lat: 43.656, lng: -79.3802 },
  { lat: 43.651, lng: -79.386 },
  { lat: 43.6548, lng: -79.3775 },
  { lat: 43.6498, lng: -79.3905 },
  { lat: 43.6578, lng: -79.375 },
];

const CAR_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="16" fill="#1a1a2e"/>
    <path d="M7 19H5v-6l2-5h14l2 5v6h-2m0 0a2 2 0 01-4 0m4 0H9m0 0a2 2 0 01-4 0M9 13h10"
      stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
);

const PIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
    <circle cx="17" cy="17" r="17" fill="#2D0A53"/>
    <circle cx="17" cy="17" r="7" fill="white"/>
    <polygon points="9,31 25,31 17,44" fill="#2D0A53"/>
  </svg>`
);

const MAP_STYLES = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

interface Props {
  selectedPoint?: { lat: number; lng: number } | null;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export default function MapComponent({ selectedPoint, onLocationSelect }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        mapRef?.panTo(loc);
      },
      () => {}
    );
  }, [mapRef]);

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (onLocationSelect && e.latLng) {
        onLocationSelect(e.latLng.lat(), e.latLng.lng());
      }
    },
    [onLocationSelect]
  );

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
      center={selectedPoint ?? center}
      zoom={14}
      onClick={onMapClick}
      onLoad={(map) => setMapRef(map)}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        styles: MAP_STYLES,
      }}
    >
      {/* User location dot */}
      <Marker
        position={center}
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

      {/* Nearby car markers */}
      {CAR_POSITIONS.map((pos, i) => (
        <Marker
          key={i}
          position={pos}
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
    </GoogleMap>
  );
}
