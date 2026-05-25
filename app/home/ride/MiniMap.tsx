"use client";

import { useCallback } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

const DEST_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <circle cx="14" cy="14" r="14" fill="#8B7500"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
    <polygon points="7,26 21,26 14,36" fill="#8B7500"/>
  </svg>`
);

interface MiniMapProps {
  lat?: number;
  lng?: number;
  selectedPoint?: { lat: number; lng: number } | null;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export default function MiniMap({
  lat = 43.6532,
  lng = -79.3832,
  selectedPoint,
  onLocationSelect,
}: MiniMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const interactive = !!onLocationSelect;
  const center = { lat, lng };

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (onLocationSelect && e.latLng) {
        onLocationSelect(e.latLng.lat(), e.latLng.lng());
      }
    },
    [onLocationSelect]
  );

  if (!isLoaded) {
    return <div style={{ width: "100%", height: "100%", background: "#e5e7eb" }} />;
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={selectedPoint ?? center}
      zoom={14}
      onClick={interactive ? onMapClick : undefined}
      options={{
        disableDefaultUI: true,
        zoomControl: false,
        clickableIcons: false,
        gestureHandling: interactive ? "auto" : "none",
        styles: [
          { featureType: "poi",     stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      }}
    >
      {/* Current location dot */}
      <Marker
        position={center}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#4f46e5",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2.5,
        }}
      />

      {/* Destination pin */}
      {selectedPoint && (
        <Marker
          position={selectedPoint}
          icon={{
            url: `data:image/svg+xml;charset=UTF-8,${DEST_SVG}`,
            scaledSize: new google.maps.Size(28, 36),
            anchor: new google.maps.Point(14, 36),
          }}
        />
      )}
    </GoogleMap>
  );
}
