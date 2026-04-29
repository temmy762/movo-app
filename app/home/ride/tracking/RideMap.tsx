"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

const carIcon = L.divIcon({
  className: "",
  html: `<div style="background:#1a1a2e;border:2px solid white;border-radius:8px;width:38px;height:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.6)">
    <svg width="28" height="14" viewBox="0 0 28 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 8 C2 8 5 2 9 2 L19 2 C23 2 26 8 26 8" stroke="white" strokeWidth="1.5" fill="none"/>
      <rect x="1" y="7" width="26" height="6" rx="2" fill="white"/>
      <circle cx="6" cy="13" r="1.5" fill="#555"/>
      <circle cx="22" cy="13" r="1.5" fill="#555"/>
    </svg>
  </div>`,
  iconSize: [38, 24],
  iconAnchor: [19, 12],
});

const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="width:30px;height:30px;background:#4f46e5;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:white;font-family:sans-serif">P</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const destIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:28px;height:28px;background:#8B7500;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center">
      <div style="width:9px;height:9px;background:white;border-radius:50%;transform:rotate(45deg)"></div>
    </div>
  </div>`,
  iconSize: [28, 36],
  iconAnchor: [14, 32],
});

const PICKUP: [number, number] = [43.662, -79.393];
const CAR: [number, number] = [43.655, -79.385];
const DEST: [number, number] = [43.644, -79.372];

function Resizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function RideMap() {
  return (
    <MapContainer
      center={[43.653, -79.382]}
      zoom={13}
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      touchZoom={false}
      doubleClickZoom={false}
      keyboard={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
      />
      <Resizer />
      <Polyline
        positions={[PICKUP, CAR, DEST]}
        pathOptions={{ color: "#8B7500", weight: 3, opacity: 0.85, dashArray: "8 5" }}
      />
      <Marker position={PICKUP} icon={pickupIcon} />
      <Marker position={CAR} icon={carIcon} />
      <Marker position={DEST} icon={destIcon} />
    </MapContainer>
  );
}
