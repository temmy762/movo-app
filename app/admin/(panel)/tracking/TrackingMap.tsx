"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15, { animate: true });
  }, [lat, lng]);
  return null;
}

const carIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:28px;height:28px">
    <div style="position:absolute;inset:-10px;border-radius:50%;background:rgba(239,68,68,0.18)"></div>
    <div style="width:28px;height:28px;background:#ef4444;border-radius:50%;border:3px solid white;
      box-shadow:0 2px 12px rgba(239,68,68,0.55);display:flex;align-items:center;justify-content:center">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M5 11l1.5-4.5h11L19 11M3 11h18v6H3zM7 17v2M17 17v2"/>
        <circle cx="7.5" cy="17" r="1.5" fill="white"/>
        <circle cx="16.5" cy="17" r="1.5" fill="white"/>
      </svg>
    </div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface TrackingMapProps {
  lat: number;
  lng: number;
  route: [number, number][];
}

export default function TrackingMap({ lat, lng, route }: TrackingMapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      scrollWheelZoom
      zoomControl
      attributionControl={false}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter lat={lat} lng={lng} />
      {route.length > 1 && (
        <Polyline
          positions={route}
          pathOptions={{ color: "#1e2d45", weight: 4, opacity: 0.85, lineJoin: "round", lineCap: "round" }}
        />
      )}
      <Marker position={[lat, lng]} icon={carIcon} />
    </MapContainer>
  );
}
