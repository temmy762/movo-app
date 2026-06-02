"use client";

import { useEffect, useRef, useState } from "react";
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
  heading?: number;
}

export default function TrackingMap({ lat, lng, route, heading = 0 }: TrackingMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("satellite");

  useEffect(() => {
    if (mapRef.current && (lat !== 0 || lng !== 0)) {
      // Use panTo for smooth movement instead of jumping
      mapRef.current.panTo({ lat, lng });
    }
  }, [lat, lng]);
  
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);
  
  // Force re-render when route changes
  useEffect(() => {
    if (route && route.length > 0) {
      console.log(`[Map] Route updated:`, route.length, "points");
    }
  }, [route]);

  if (!isLoaded) {
    return <div style={{ width: "100%", height: "100%", background: "#1a1a1a" }} />;
  }

  const path = route.map(([rlat, rlng]) => ({ lat: rlat, lng: rlng }));

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={{ lat, lng }}
        zoom={16}
        onLoad={(map) => { mapRef.current = map; }}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          mapTypeId: mapType,
          styles: [
            { featureType: "poi",     stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        }}
      >
      {/* Route trail with gradient effect */}
      {path.length > 1 && (
        <>
          <Polyline
            path={path}
            options={{
              strokeColor: "#3b82f6",
              strokeWeight: 3,
              strokeOpacity: 0.7,
              geodesic: true,
            }}
          />
          {/* Waypoint markers for every 5th point to avoid clutter */}
          {path.map((point, idx) => {
            if (idx % 5 !== 0 || idx === path.length - 1) return null;
            return (
              <Marker
                key={`waypoint-${idx}`}
                position={point}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 4,
                  fillColor: "#60a5fa",
                  fillOpacity: 0.6,
                  strokeColor: "#1e40af",
                  strokeWeight: 1,
                }}
              />
            );
          })}
        </>
      )}
      
      {/* Current car position marker */}
      <Marker
        position={{ lat, lng }}
        icon={{
          url: `data:image/svg+xml;charset=UTF-8,${CAR_SVG}`,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
          rotation: heading,
        }}
        title={`Current Position: ${lat.toFixed(4)}, ${lng.toFixed(4)}`}
      />
      </GoogleMap>

      {/* Map Type Toggle */}
      <button
        onClick={() => setMapType(mapType === "satellite" ? "roadmap" : "satellite")}
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          background: "white",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "8px 12px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "500",
          zIndex: 10,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        {mapType === "satellite" ? "🗺️ Map" : "🛰️ Satellite"}
      </button>
    </div>
  );
}
