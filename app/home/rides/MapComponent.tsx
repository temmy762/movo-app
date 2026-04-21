"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CAR_POSITIONS: [number, number][] = [
  [51.522, -0.108],
  [51.519, -0.099],
  [51.525, -0.102],
  [51.517, -0.112],
  [51.523, -0.095],
];

const carIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;background:#1a1a2e;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
      <path d="M5 17H3v-5l2-5h14l2 5v5h-2m0 0a2 2 0 01-4 0m4 0H7m0 0a2 2 0 01-4 0M7 10h10"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#4f46e5;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #4f46e5"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    map.setView([51.52, -0.103], 14);
  }, [map]);
  return null;
}

export default function MapComponent() {
  return (
    <MapContainer
      center={[51.52, -0.103]}
      zoom={14}
      scrollWheelZoom={false}
      zoomControl={false}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds />
      <Circle
        center={[51.52, -0.103]}
        radius={400}
        pathOptions={{ color: "#4f46e5", fillColor: "#4f46e5", fillOpacity: 0.08, weight: 1.5 }}
      />
      <Marker position={[51.52, -0.103]} icon={userIcon} />
      {CAR_POSITIONS.map((pos, i) => (
        <Marker key={i} position={pos} icon={carIcon} />
      ))}
    </MapContainer>
  );
}
