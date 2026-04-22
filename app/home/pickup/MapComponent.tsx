"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const CAR_POSITIONS: [number, number][] = [
  [43.6560, -79.3802],
  [43.6510, -79.3860],
  [43.6548, -79.3775],
  [43.6498, -79.3905],
  [43.6578, -79.3750],
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

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:32px;height:32px;background:#2D0A53;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center">
      <div style="width:10px;height:10px;background:white;border-radius:50%;transform:rotate(45deg)"></div>
    </div>
  </div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 36],
});

function InitialView() {
  const map = useMap();
  useEffect(() => {
    map.setView([43.6532, -79.3832], 14);
    // Invalidate size after mount — fixes grey tiles when container size settles late
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  selectedPoint?: { lat: number; lng: number } | null;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export default function MapComponent({ selectedPoint, onLocationSelect }: Props) {
  return (
    <MapContainer
      center={[43.6532, -79.3832]}
      zoom={14}
      scrollWheelZoom={true}
      zoomControl={true}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <InitialView />
      {onLocationSelect && <ClickHandler onPick={onLocationSelect} />}
      <Circle
        center={[43.6532, -79.3832]}
        radius={400}
        pathOptions={{ color: "#4f46e5", fillColor: "#4f46e5", fillOpacity: 0.08, weight: 1.5 }}
      />
      <Marker position={[43.6532, -79.3832]} icon={userIcon} />
      {CAR_POSITIONS.map((pos, i) => (
        <Marker key={i} position={pos} icon={carIcon} />
      ))}
      {selectedPoint && (
        <Marker position={[selectedPoint.lat, selectedPoint.lng]} icon={pinIcon} />
      )}
    </MapContainer>
  );
}
