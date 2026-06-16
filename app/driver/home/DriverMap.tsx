"use client";

import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useMemo } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

const CAR_ICON_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="20" fill="#2D0A53" opacity="0.9"/>
    <path d="M11 19l2-6h14l2 6M9 19h22v8H9zM13 27v2M27 27v2" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <circle cx="14" cy="27" r="2" fill="white"/>
    <circle cx="26" cy="27" r="2" fill="white"/>
  </svg>`
);

const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832 }; /* Toronto */

const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
];

interface Props {
  position: { lat: number; lng: number } | null;
}

export default function DriverMap({ position }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const center = useMemo(
    () => position ?? DEFAULT_CENTER,
    [position?.lat, position?.lng] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const carIcon = useMemo(() => ({
    url: `data:image/svg+xml,${CAR_ICON_SVG}`,
    scaledSize: isLoaded ? new window.google.maps.Size(40, 40) : undefined,
    anchor:     isLoaded ? new window.google.maps.Point(20, 20) : undefined,
  }), [isLoaded]);

  if (!isLoaded || !API_KEY) {
    return <div className="absolute inset-0" style={{ background: "#1a1e3c" }} />;
  }

  return (
    <div className="absolute inset-0">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={position ? 15 : 12}
        options={{
          disableDefaultUI: true,
          zoomControl: false,
          styles: MAP_STYLES,
          clickableIcons: false,
        }}
      >
        {position && (
          <Marker
            position={position}
            icon={carIcon}
          />
        )}
      </GoogleMap>
    </div>
  );
}
