"use client";

import { useEffect, useRef } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

const CAR_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="18" fill="#ef4444" opacity="0.18"/>
    <circle cx="18" cy="18" r="14" fill="#ef4444" stroke="white" stroke-width="3"/>
    <path d="M10 17l1.5-4.5h13L26 17M8 17h20v6H8zM12 23v2M24 23v2"
      stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <circle cx="12.5" cy="23" r="1.5" fill="white"/>
    <circle cx="23.5" cy="23" r="1.5" fill="white"/>
  </svg>`
);

interface TrackingMapProps {
  lat: number;
  lng: number;
  route: [number, number][];
}

export default function TrackingMap({ lat, lng, route }: TrackingMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
    }
  }, [lat, lng]);

  if (!isLoaded) {
    return <div style={{ width: "100%", height: "100%", background: "#f1f5f9" }} />;
  }

  const path = route.map(([rlat, rlng]) => ({ lat: rlat, lng: rlng }));

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={{ lat, lng }}
      zoom={15}
      onLoad={(map) => { mapRef.current = map; }}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        styles: [
          { featureType: "poi",     stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      }}
    >
      {path.length > 1 && (
        <Polyline
          path={path}
          options={{
            strokeColor: "#1e2d45",
            strokeWeight: 4,
            strokeOpacity: 0.85,
          }}
        />
      )}
      <Marker
        position={{ lat, lng }}
        icon={{
          url: `data:image/svg+xml;charset=UTF-8,${CAR_SVG}`,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        }}
      />
    </GoogleMap>
  );
}
